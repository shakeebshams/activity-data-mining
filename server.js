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
    let cityList = [];
    MongoClient.connect(DBurl, { useNewUrlParser: true }, async (err, client) => {
        if (err) return console.log(err);
        // Storing a reference to the database so you can use it later
        db = client.db(dbName);
        console.log(`Connected MongoDB: ${DBurl}`);
        console.log(`Database: ${dbName}`);
        let collection = db.collection("citylist");
        let cursor = collection.find({});
        //console.log(cursor);
        //let docArray = cursor.toArray();
        //let arr = collection.find().snapshot();
        //console.log(arr.length)
        await collection.find().snapshot().forEach(async function(doc) {
            try {
                if (doc.id) {
                    //console.log("city_id: " + doc.id);
                    cityList.push(doc.id);
                    //await activity_request(doc.id);
                }
            } catch (err) {
                console.error(error);
            }
        });

        for (let i = 0; i < cityList.length; i++) {
            console.log("processing city #" + i);
            let city_id = cityList[i];
            await activity_request(city_id);
        }
    });

}

async function activity_request(location_id) {
    let start_url = `https://api.tripadvisor.com/api/internal/1.14/location/${location_id}/attractions?currency=USD&lang=en&limit=50`
    let next = true
    try {
        while (next) {
            await axios.get(start_url, { 'headers': {'X-TripAdvisor-API-Key': process.env.API_KEY} })
                .then((response) => {
                    if (response.data && response.data.paging) {
                        process_data(response.data.data);
                        if (response.data.paging.next === null) {
                            next = false;
                        }
                        start_url = response.data.paging.next;
                    } else {
                        next = false;
                    }
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
        let isGolf = false;
        let types = activity.subtype;
        if (types) {
            types.forEach(t => {
                if (t.key === '60') {
                    isGolf = true;
                }
            });
            let activity_data = {
                name: activity.name,
                rating: activity.rating,
                description: activity.description,
                num_reviews: activity.num_reviews,
                website: activity.website,
                phone: activity.phone,
                email: activity.email,
                address: activity.address,
                city: activity.address_obj.city,
                state: activity.address_obj.state,
                country: activity.address_obj.country,
                latitude: activity.latitude,
                longitude: activity.longitude,
                tripadvisor_id: activity.location_id
            }
            if (isGolf && activity_data.country === 'United States') {
                let collection2 = db.collection("golfygolf");
                await collection2.insertOne(activity_data, function(err, res) {
                    if (err) {
                        console.log(err);
                    };
                    console.log("ADDED " + activity_data.city);
                })
            }
            /*
            let collection2 = db.collection("activitylist");
            await collection2.insertOne(activity_data, function(err, res) {
                if (err) {
                    console.log(err);
                };
            })
            */
        }
        
    }
}


main()