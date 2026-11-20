CREATE TABLE IF NOT EXISTS hourly_forecasts (
    date DATE NOT NULL,
    provider_name VARCHAR(100),
    forecast_hour TIME,
    temperature DECIMAL(5,2),
    precipitation DECIMAL(5,2)
);

CREATE TABLE IF NOT EXISTS daily_forecasts (
    date DATE NOT NULL,
    provider_name VARCHAR(100),
    min_temperature DECIMAL(5,2),
    max_temperature DECIMAL(5,2),
    precipitation_sum DECIMAL(5,2)
);