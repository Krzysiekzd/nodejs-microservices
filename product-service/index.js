const express = require('express');
const app = express();
app.use(express.json());

app.get('/products', (req, res) => {
  res.json({ message: 'Product Service Working' });
});

app.listen(3000, () => {
  console.log('Product Service running on port 3000');
});
