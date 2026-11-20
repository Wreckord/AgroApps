# AgroApps
Installation and setup: Open Meteo requests with npm and Docker and Docker Compose needed, as well as credentials on an .env file. Example is provided in this repo. To build the app, run 'docker compose up -d --build'. To test it immediately (since it runs every day at midnight) run 'docker compose exec weather-app php app/php/scheduler.php --once'

Implementation Choices: Main app runs with PHP on Docker Compose, while the communication with the APIs and the PostgreSQL database is done through a TypeScript file, using the APIs' connection methods. PHP calls upon the TS file every midnight and saves the data on the database. The decision to use TypeScript was a) due to familiarity with the language, b) example scripts provided by the Open Meteo API, c) no troubleshooting issues during data insertion.

Incomplete Requirements: Connection with WeatherAPI was ommited due to time constraints.

Next Steps: Optimization of the connection functions between the TypeScript file and the database, in terms of effectiveness and readability, and also connection of this app with a Frontend framework.

Additional Notes: AI was used to help with the PHP part of the app due to low familiarity with the language and time constraints. Issues with that can be fixed in time. ALSO LATE NOTE: I made a mistake with the hourly precipitation data. Instead of uploading the raw data, I uploaded the probability. 
