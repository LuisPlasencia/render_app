var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Trabajo de TARCE' });
});

/* GET simulate page. */
router.get('/simulate', function(req, res, next) {
  res.render('simulate', { title: 'Simulate | Trabajo de TARCE' });
});

/* GET about page. */
router.get('/about', function(req, res, next) {
  res.render('about', { title: 'About | Trabajo de TARCE' });
});

module.exports = router;
