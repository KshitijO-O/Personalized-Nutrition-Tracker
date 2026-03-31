# NutriTrack

## Setup Instructions

### 1. Clone the repository

git clone <your-repo-link>
cd nutritrack

### 2. Install dependencies

npm install

### 3. Configure environment variables

cp .env.example .env

Create a `.env` file in the root directory and add:

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=nutritrack
JWT_SECRET=your_secret_key

### 4. Setup the database

Make sure MySQL is running, then run:

node scripts/setup-db.js

### 5. Start the server

node server/server.js

### 6. Open the application

Open your browser and go to:

http://localhost:3000

---

## Notes

* Do not upload your `.env` file
* Make sure MySQL service is running before setup
* To reset food data:
  Delete all rows from `food_items` and run setup again
