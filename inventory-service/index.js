const express = require('express');
const app = express();
app.use(express.json());

app.get('/inventory', (req, res) => {
  res.json({ message: 'Inventory Service Working' });
});

app.listen(3000, () => {
  console.log('Inventory Service running on port 3000');
});
