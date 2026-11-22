var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Trabajo de TARCE', currentPage: 'home' });
});

/* GET simulate page. */
router.get('/simulate', function(req, res, next) {
  res.render('simulate', { title: 'Simulador | Trabajo de TARCE', currentPage: 'simulate' });
});

/* GET about page. */
router.get('/about', function(req, res, next) {
  res.render('about', { title: 'Acerca de | Trabajo de TARCE', currentPage: 'about' });
});

module.exports = router;
