const express = require('express');
const app = express();
app.use(express.json());

app.post('/notify', (req, res) => {
  console.log('Notification:', req.body);
  res.json({ message: 'Notification received' });
});

app.listen(3000, () => {
  console.log('Notification Service running on port 3000');
});
