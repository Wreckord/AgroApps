import { fetchWeatherApi } from "openmeteo";
import { pool } from "./database.ts";

const timestamp = Date.now();

const currentDate = new Date(timestamp).toISOString().split('T')[0];

const hourlyParams = {
	latitude: 37.9838,
	longitude: 23.7278,
	hourly: ["precipitation_probability", "temperature_2m"],
	timezone: "Europe/Berlin",
	start_date: currentDate,
	end_date: currentDate,
};

const url = "https://api.open-meteo.com/v1/forecast";
const hourlyResponses = await fetchWeatherApi(url, hourlyParams);
const hourlyResponse = hourlyResponses[0];
const hourly = hourlyResponse.hourly()!;
const utcOffsetSeconds = hourlyResponse.utcOffsetSeconds();

const weatherHourlyData = {
	hourly: {
		time: Array.from(
			{ length: (Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval() }, 
			(_ , i) => new Date((Number(hourly.time()) + i * hourly.interval() + utcOffsetSeconds) * 1000)
		),
		precipitation_probability: hourly.variables(0)!.valuesArray(),
		temperature_2m: hourly.variables(1)!.valuesArray(),
	},
};

const dailyParams = {
	latitude: 37.9838,
	longitude: 23.7278,
	daily: ["temperature_2m_max", "temperature_2m_min", "precipitation_sum"],
	timezone: "Europe/Berlin",
	start_date: currentDate,
	end_date: currentDate,
};
const dailyResponses = await fetchWeatherApi(url, dailyParams);
const dailyResponse = dailyResponses[0];
const OffsetSeconds = dailyResponse.utcOffsetSeconds();
const daily = dailyResponse.daily()!;

const weatherDailyData = {
	daily: {
		time: Array.from(
			{ length: (Number(daily.timeEnd()) - Number(daily.time())) / daily.interval() }, 
			(_ , i) => new Date((Number(daily.time()) + i * daily.interval() + OffsetSeconds) * 1000)
		),
		temperature_2m_max: daily.variables(0)!.valuesArray(),
		temperature_2m_min: daily.variables(1)!.valuesArray(),
		precipitation_sum: daily.variables(2)!.valuesArray(),
	},
};


async function insertHourlyForecasts(timeData: Date[], temperatureData: Float32Array<ArrayBufferLike> | null, precipitationData: Float32Array<ArrayBufferLike> | null){
	const client = await pool.connect();
	try{
		await client.query("BEGIN");

		const query = `
			INSERT INTO hourly_forecasts(
				date,
				provider_name,
				forecast_hour,
				temperature,
				precipitation
			)
			VALUES($1, $2, $3, $4, $5)`;
		
		for(let i=0; i<24; i++){
			let date = new Date(timeData[i]);
			let dateString = date.toISOString().split("T")[0];
			let timeString = date.toISOString().split("T")[1].split(".")[0]
			await client.query(query, [
				dateString,
				"openmeteo",
				timeString,
				temperatureData[i],
				precipitationData[i]
			]);
			await client.query("COMMIT");
			console.log("Hourly Forecasts Inserted");
		}

	}catch(error){
		await client.query("ROLLBACK");
		console.error("Failed to insert forecasts: ",error);
		throw error;
	}
	finally{
		client.release();
	}
}

async function insertDailyForecasts(timeData: Date[], minTemperatureData: Float32Array<ArrayBufferLike> | null, maxTemperatureData: Float32Array<ArrayBufferLike> | null,precipitationData: Float32Array<ArrayBufferLike> | null){
	const client = await pool.connect();
	try{
		await client.query("BEGIN");

		const query = `
			INSERT INTO daily_forecasts(
				date,
				provider_name,
				min_temperature,
				max_temperature,
				precipitation_sum
			)
			VALUES($1, $2, $3, $4, $5)`;
		
		let date = new Date(timeData[0]);
		let dateString = date.toISOString().split("T")[0];
		await client.query(query, [
			dateString,
			"openmeteo",
			minTemperatureData[0],
			maxTemperatureData[0],
			precipitationData[0]
		]);
		await client.query("COMMIT");
		console.log("Daily Forcasts Inserted");

	}catch(error){
		await client.query("ROLLBACK");
		console.error("Failed to insert forecasts: ",error);
		throw error;
	}
	finally{
		client.release();
	}
}


await insertDailyForecasts(weatherDailyData.daily.time, weatherDailyData.daily.temperature_2m_min, weatherDailyData.daily.temperature_2m_max, weatherDailyData.daily.precipitation_sum);
await insertHourlyForecasts(weatherHourlyData.hourly.time, weatherHourlyData.hourly.temperature_2m, weatherHourlyData.hourly.precipitation_probability);