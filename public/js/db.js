// create a new db request for a "budget" database.
let db;
const request = indexedDB.open("budget", 1);

// When the database is first created...
request.onupgradeneeded = function (event) {
  // create object store called "pending" and set autoIncrement to true
  const db = event.target.result;
  db.createObjectStore("pending", { autoIncrement: true });
};

// Once the index db is connected...
request.onsuccess = function (event) {
  db = event.target.result;
  // check if app is online then read the index db
  if (navigator.onLine) {
    checkDatabase();
  }
};

// Error logging
request.onerror = function (event) {
  console.log("Woops! " + event.target.errorCode);
};

// function to add a record to the database
function saveRecord(record) {
  // create a transaction on the pending db with readwrite access
  const transaction = db.transaction(["pending"], "readwrite");

  // access your pending object store
  const store = transaction.objectStore("pending");

  // add record to your store with add method.
  store.add(record);
}

// Function to check the database called once the app is back online
function checkDatabase() {
  // open a transaction on your pending db
  const transaction = db.transaction(["pending"], "readwrite");
  // access your pending object store
  const store = transaction.objectStore("pending");
  // get all records from the index db
  const getAll = store.getAll();

  // once all transactions are retrieved
  getAll.onsuccess = function () {
      // if there are any transactions to add to the database...
    if (getAll.result.length > 0) {
      // send a post request to the bulk create api route with all of the retrieved data
      fetch("/api/transaction/bulk", {
        method: "POST",
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then(() => {
          // if successful, open a transaction and empty the index db
          const transaction = db.transaction(["pending"], "readwrite");
          const store = transaction.objectStore("pending");
          store.clear();
        });
    }
  };
}

// listen for app to come online
window.addEventListener("online", checkDatabase);
