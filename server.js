import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();
import Apify from 'apify'
const { log, sleep, requestAsBrowser } = Apify.utils;
import cheerio from 'cheerio';
import pkg from 'mongodb';
const { MongoClient } = pkg;
const DBurl = process.env.MONGO_URI

const dbName = 'cities'
let db



async function main() {
    //using for loop intead of for each as it would be processed async by default
    MongoClient.connect(DBurl, { useNewUrlParser: true }, (err, client) => {
        if (err) return console.log(err);
        // Storing a reference to the database so you can use it later
        db = client.db(dbName);
        console.log(`Connected MongoDB: ${DBurl}`);
        console.log(`Database: ${dbName}`);
        let collection = db.collection("citylist");
        let cursor = collection.find({});
        //console.log(cursor);
        let docArray = cursor.toArray();
        let arr = collection.find().snapshot();
        console.log(arr.length)
        /*
        collection.find().snapshot().forEach(async function(doc) {
            console.log("now precessing: " + doc.id);
            try {
                await activity_request(doc.id);
            } catch (err) {
                console.error(error);
            }
        });
        */
        activity_request('60898');
    });
}

async function activity_request(location_id) {
    let start_url = `https://api.tripadvisor.com/api/internal/1.14/location/${location_id}/attractions?currency=USD&lang=en&limit=50`
    let next = true
    try {
        while (next) {
            await axios.get(start_url, { 'headers': {'X-TripAdvisor-API-Key': process.env.API_KEY} })
                .then((response) => {
                    console.log(response.data.data.length);
                    process_data(response.data.data);
                    console.log(response.data.paging.next);
                    if (response.data.paging.next === null) {
                        next = false;
                    }
                    start_url = response.data.paging.next;
                })
                .catch((error) => {
                    console.log(error);
                    next = false;
                });
        }
    } catch (err) {
        console.log("error in request, skipping to another city");
        return;
    }
    return;
}

async function process_data(data) {
    for (let i = 0; i < data.length; i++) {
        let activity = data[i];
        let activity_data = {
            name: activity.name,
            latitude: activity.latitude,
            longitude: activity.longitude,
            type: activity.subcategory_type_label,
            tripadvisor_ranking: activity.ranking,
            price_range: activity.price,
            stars: activity.hotel_class,
            description: activity.description,
            website: activity.website,
            phone: activity.phone,
            email: activity.email,
            address: activity.address,
            city: activity.address_obj.city,
            state: activity.address_obj.state,
        }
        let collection = db.collection("hotels-again");
        await collection.insertOne(hotel_data, function(err, res) {
            if (err) {
                console.log(err);
            };
        })
    }
}


main()