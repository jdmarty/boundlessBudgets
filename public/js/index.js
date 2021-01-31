let transactions = [];
let myChart;

// retrieve all transactions
fetch("/api/transaction")
  .then(response => {
    return response.json();
  })
  .then(data => {
    // save db data on global variable
    transactions = data;
    // populate DOM elements
    populateTotal();
    populateTable();
    populateChart();
  });

// Function to display the total at the top of the page
function populateTotal() {
  // reduce transaction amounts to a single total value
  let total = transactions.reduce((total, t) => {
    return total + parseInt(t.value);
  }, 0);
  // set the total element to display the total
  let totalEl = document.querySelector("#total");
  totalEl.textContent = total;
}

// Function to display all transactions in a table
function populateTable() {
  // target and empty the table body
  let tbody = document.querySelector("#tbody");
  tbody.innerHTML = "";

  // For every transaction retrieved from the database...
  transactions.forEach(transaction => {
    // create and populate a table row
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${transaction.name}</td>
      <td>${transaction.value}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Function to fill the chart with transaction history
function populateChart() {
  // copy array and reverse it
  let reversed = transactions.slice().reverse();
  // set the sum of transactions to 0 at the start
  let sum = 0;

  // create date labels for chart
  let labels = reversed.map(t => {
    let date = new Date(t.date);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  });

  // Create an array that describes the total of the budget with each transaction
  let data = reversed.map(t => {
    sum += parseInt(t.value);
    return sum;
  });

  // remove old chart if it exists
  if (myChart) {
    myChart.destroy();
  }

  // target the chart canvas
  let ctx = document.getElementById("myChart").getContext("2d");

  // create a new chart on that canvas
  myChart = new Chart(ctx, {
    type: 'line',
      data: {
        labels,
        datasets: [{
            label: "Total Over Time",
            fill: true,
            backgroundColor: "#6666ff",
            data
        }]
    }
  });
}

// function to add a transaction to the database
function sendTransaction(isAdding) {
  // extract data from the DOM
  let nameEl = document.querySelector("#t-name");
  let amountEl = document.querySelector("#t-amount");
  let errorEl = document.querySelector(".form .error");

  // validate form
  if (nameEl.value === "" || amountEl.value === "") {
    errorEl.textContent = "Missing Information";
    return;
  }
  else {
    errorEl.textContent = "";
  }

  // create record
  let transaction = {
    name: nameEl.value,
    value: amountEl.value,
    date: new Date().toISOString()
  };

  // if subtracting funds, convert amount to negative number
  if (!isAdding) {
    transaction.value *= -1;
  }

  // add to beginning of current array of data
  transactions.unshift(transaction);

  // re-run logic to populate ui with new record
  populateChart();
  populateTable();
  populateTotal();
  
  // also send to server
  fetch("/api/transaction", {
    method: "POST",
    body: JSON.stringify(transaction),
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json"
    }
  })
  .then(response => {    
    return response.json();
  })
  .then(data => {
    if (data.errors) {
      errorEl.textContent = "Missing Information";
    }
    else {
      // clear form
      nameEl.value = "";
      amountEl.value = "";
    }
  })
  .catch(err => {
    // fetch failed, so save in indexed db
    saveRecord(transaction);

    // clear form
    nameEl.value = "";
    amountEl.value = "";
  });
}

function clearTransaction() {
  // ask for confirmation before deleting records
  const goAhead = confirm("Are you sure you want to delete all transaction records?")
  if (!goAhead) return
  // run delete call from api
  fetch("/api/transaction", {
    method: "DELETE"
  })
  // reset chart, table, and total
  transactions = [];
  populateChart();
  populateTable();
  populateTotal();
  // clear indexeddb
  clearRecords()
}

// listeners for add and subtract buttons
document.querySelector("#add-btn").onclick = function() {
  sendTransaction(true);
};

document.querySelector("#sub-btn").onclick = function() {
  sendTransaction(false);
};

document.querySelector("#clr-btn").onclick = function () {
  clearTransaction();
};
