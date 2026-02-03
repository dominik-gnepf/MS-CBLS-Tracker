@echo off
echo Starting MS Daily Tracker Database...
docker-compose up -d
echo.
echo Database container started!
echo.
echo Connection details:
echo   Host: localhost
echo   Port: 5432
echo   Database: ms_tracker_db
echo   Username: ms_tracker
echo   Password: ms_tracker_secret
echo.
echo Use 'docker-compose logs -f' to view logs
echo Use 'docker-compose down' to stop
