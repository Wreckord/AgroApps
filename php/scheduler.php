<?php
declare(strict_types=1);

date_default_timezone_set(getenv('APP_TIMEZONE') ?: 'Europe/Berlin');

$timezone = new DateTimeZone(getenv('APP_TIMEZONE') ?: 'Europe/Berlin');
$logFile = getenv('LOG_FILE') ?: '/var/log/weather/weather.log';
$lockFile = '/var/log/weather/weather-job.lock';
$maxAttempts = max(1, (int) (getenv('MAX_ATTEMPTS') ?: 3));
$retryBaseSeconds = max(1, (int) (getenv('RETRY_BASE_SECONDS') ?: 60));
$appDir = '/app';
$tsx = '/app/node_modules/.bin/tsx';
$script = '/app/read_openmeteo.ts';

if (!is_dir(dirname($logFile))) {
    mkdir(dirname($logFile), 0775, true);
}

function logMessage(string $message): void
{
    global $logFile, $timezone;
    $line = '[' . (new DateTimeImmutable('now', $timezone))->format('Y-m-d H:i:s T') . '] ' . $message . PHP_EOL;
    file_put_contents($logFile, $line, FILE_APPEND | LOCK_EX);
    echo $line;
}

function executeWeatherJob(): bool
{
    global $tsx, $script, $appDir, $maxAttempts, $retryBaseSeconds, $lockFile;

    $lock = fopen($lockFile, 'c');
    if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
        logMessage('Another weather job appears to be running; skipping this execution.');
        return false;
    }

    try {
        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            logMessage("Starting Open-Meteo collection (attempt {$attempt}/{$maxAttempts}).");

            $descriptors = [
                0 => ['pipe', 'r'],
                1 => ['file', getenv('LOG_FILE') ?: '/var/log/weather/weather.log', 'a'],
                2 => ['file', getenv('LOG_FILE') ?: '/var/log/weather/weather.log', 'a'],
            ];

            $process = proc_open([$tsx, $script], $descriptors, $pipes, $appDir);
            if (!is_resource($process)) {
                logMessage('Could not start the TypeScript process.');
                $exitCode = 127;
            } else {
                fclose($pipes[0]);
                $exitCode = proc_close($process);
            }

            if ($exitCode === 0) {
                logMessage('Weather collection completed successfully.');
                return true;
            }

            logMessage("Weather collection failed with exit code {$exitCode}.");
            if ($attempt < $maxAttempts) {
                $delay = min(900, $retryBaseSeconds * (2 ** ($attempt - 1)));
                logMessage("Retrying in {$delay} seconds.");
                sleep($delay);
            }
        }

        logMessage("All {$maxAttempts} attempts failed. The next scheduled run will be at the next midnight.");
        return false;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

if (($argv[1] ?? '') === '--once') {
    exit(executeWeatherJob() ? 0 : 1);
}

logMessage('PHP scheduler started. Timezone: ' . $timezone->getName());

if (filter_var(getenv('RUN_ON_START') ?: 'false', FILTER_VALIDATE_BOOLEAN)) {
    executeWeatherJob();
}

while (true) {
    $now = new DateTimeImmutable('now', $timezone);
    $nextMidnight = $now->modify('tomorrow')->setTime(0, 0, 0);
    $secondsUntilRun = max(1, $nextMidnight->getTimestamp() - $now->getTimestamp());

    logMessage('Next collection scheduled for ' . $nextMidnight->format('Y-m-d H:i:s T'));
    sleep($secondsUntilRun);
    executeWeatherJob();
}
