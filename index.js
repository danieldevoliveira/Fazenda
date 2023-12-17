const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Connect to MySQL database
const connection = mysql.createConnection({
  host: 'regulus.cotuca.unicamp.br',
  user: 'BD22595',
  password: 'BD22595',
  database: 'BD22595',
});

connection.connect(err => {
  if (err) {
    console.error('Error connecting to MySQL database: ' + err.stack);
    return;
  }
  console.log('Connected to MySQL database');
});


// Serve static files from the 'public' folder
app.use(express.static('public'));

// Set up body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Define routes

// Home page (GET)
app.get('/', (req, res) => {
  connection.query('SELECT * FROM regiao', (error, results) => {
    if (error) throw error;

    // Render the dashboard page with the regiao data
    res.render('index', { regioes: results });
  });
});

app.get('/index', (req, res) => {
  connection.query('SELECT * FROM regiao', (error, results) => {
    if (error) throw error;

    // Render the dashboard page with the regiao data
    res.render('index', { regioes: results });
  });
});


// Define the route to handle individual regiao redirects
app.get('/dashboard/:id', (req, res) => {
  const regiaoId = req.params.id;
  const query = 'SELECT regiao.id AS regiao_id, regiao.nome AS regiao_nome, ' +
                'planta.nome AS planta_nome, planta.temp_basal AS planta_temp_basal, planta.gd AS planta_gd, plantacao.data_inicial ' +
                'FROM regiao ' +
                'LEFT JOIN plantacao ON regiao.id = plantacao.id_regiao ' +
                'LEFT JOIN planta ON plantacao.id_planta = planta.id ' +
                'WHERE regiao.id = ?'; // Filter by the specified region ID

   // Fetch temperatures data from the database
  const temperaturaQuery = 'SELECT * FROM temperatura';

  // Fetch regions data from the database
  const regiaoQuery = 'SELECT * FROM regiao';

   // Fetch daily temperature summary data from the database
  const dailyTemperatureQuery = 'SELECT * FROM daily_temperature_view ORDER by data DESC';

  // Use Promise.all to execute the queries concurrently
  Promise.all([
    connection.promise().query(query, [regiaoId]),
    connection.promise().query(temperaturaQuery),
    connection.promise().query(regiaoQuery),
    connection.promise().query(dailyTemperatureQuery),
  ])
  .then(([dashboardResults, temperaturaResults, regiaoResults, dailyTemperatureResults]) => {
    const dashboardData = dashboardResults[0];
    const temperaturas = temperaturaResults[0];
    const regioes = regiaoResults[0];
    const dailyTemperatureData = dailyTemperatureResults[0];
    
    // Render the 'dashboard' view with the necessary data
    res.render('dashboard', { regiaoId, dashboardData, temperaturas, regioes, dailyTemperatureData });
  })
  .catch(error => {
    console.error('Error fetching data for dashboard:', error);
    res.status(500).send('Internal Server Error');
  });
});

// Dashboard (GET)

// Dashboard (POST) - Handle request for historical temperatures
app.post('/dashboard/temperaturas', (req, res) => {
  const regiaoId = req.body.regiao_id;
  const query = 'SELECT * FROM temperatura WHERE regiao_id = ?';

  connection.promise().query(query, [regiaoId])
    .then(results => {
      const temperaturas = results[0];

      // Render the 'dashboard' view with the historical temperatures data
      res.render('dashboard', { dashboardData, temperaturas, regioes });
    })
    .catch(error => {
      console.error('Error fetching historical temperatures:', error);
      res.status(500).send('Internal Server Error');
    });
});




app.get('/suasPlantacoes', (req, res) => {
  const query = 'SELECT regiao.nome AS regiao_nome, planta.nome AS planta_nome, plantacao.data_inicial, plantacao.id FROM plantacao ' +
                'JOIN regiao ON plantacao.id_regiao = regiao.id ' +
                'JOIN planta ON plantacao.id_planta = planta.id';


  // Fetch regions and plants data from the database
  const regiaoQuery = 'SELECT * FROM regiao';
  const plantaQuery = 'SELECT * FROM planta';

  // Use Promise.all to execute both queries concurrently
  Promise.all([
    connection.promise().query(query),
    connection.promise().query(regiaoQuery),
    connection.promise().query(plantaQuery)
  ])
  .then(([plantacaoResults, regiaoResults, plantaResults]) => {
    // Extract results from the query responses
    const plantacao = plantacaoResults[0];
    const regioes = regiaoResults[0];
    const plantas = plantaResults[0];

    // Render the 'plantacao' view with the necessary data
    res.render('suasPlantacoes', { plantacao, regioes, plantas });
  })
  .catch(error => {
    console.error('Error fetching data for plantacao:', error);
    res.status(500).send('Internal Server Error');
  });
});



// Plantação (GET)
app.get('/plantacao', (req, res) => {
  const query = 'SELECT regiao.nome AS regiao_nome, planta.nome AS planta_nome, plantacao.data_inicial FROM plantacao ' +
                'JOIN regiao ON plantacao.id_regiao = regiao.id ' +
                'JOIN planta ON plantacao.id_planta = planta.id';


  // Fetch regions and plants data from the database
  const regiaoQuery = 'SELECT * FROM regiao';
  const plantaQuery = 'SELECT * FROM planta';

  // Use Promise.all to execute both queries concurrently
  Promise.all([
    connection.promise().query(query),
    connection.promise().query(regiaoQuery),
    connection.promise().query(plantaQuery)
  ])
  .then(([plantacaoResults, regiaoResults, plantaResults]) => {
    // Extract results from the query responses
    const plantacao = plantacaoResults;
    const regioes = regiaoResults[0];
    const plantas = plantaResults[0];

    // Render the 'plantacao' view with the necessary data
    res.render('plantacao', { plantacao, regioes, plantas });
  })
  .catch(error => {
    console.error('Error fetching data for plantacao:', error);
    res.status(500).send('Internal Server Error');
  });
});

// Plantação (POST)
app.post('/plantacao/add', async (req, res) => {
  try {
    const { id_regiao, id_planta, data_inicial } = req.body;
    const query = 'INSERT INTO plantacao (id_regiao, id_planta, data_inicial) VALUES (?, ?, ?)';
    await connection.promise().query(query, [id_regiao, id_planta, data_inicial]);
    res.redirect('/plantacao');
  } catch (error) {
    console.error('Error handling POST request:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Delete Plantacao
app.get('/plantacao/delete/:id', (req, res) => {
  const id = req.params.id;
  connection.query('DELETE FROM plantacao WHERE id = ?', [id], (error) => {
    if (error) {
      console.error('Error deleting plantacao:', error);
      res.status(500).send('Internal Server Error');
    } else {
      res.redirect('/plantacao');
    }
  });
});

// Plantas
app.get('/plantas', (req, res) => {
  const query = 'SELECT * FROM planta';
  const regiaoQuery = 'SELECT * FROM regiao';
  Promise.all([
  connection.promise().query(query),
  connection.promise().query(regiaoQuery),
  ])
  .then(([queryResults, regiaoResults]) => {
  const plantas = queryResults[0];
  const regioes = regiaoResults[0];

  res.render('plantas', { plantas, regioes})
  })
.catch(error => {
  console.error('Error fetching data for plantas:', error);
  res.status(500).send('Internal Server Error');
  });
});

app.get('/cadastroPlantas', (req, res) => {
  connection.query('SELECT * FROM planta', (error, results) => {
    if (error) throw error;
    res.render('cadastroPlantas', { plantas: results });
  });
});


// Create (POST)
app.post('/cadastroPlantas/add', async (req, res) => {
  try {
    const { nome, temp_basal, gd } = req.body;
    const query = 'INSERT INTO planta (nome, temp_basal, gd) VALUES (?, ?, ?)';
    await connection.promise().query(query, [nome, temp_basal, gd]);
    res.redirect('/cadastroPlantas');
  } catch (error) {
    console.error('Error handling POST request:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Update (GET)
app.get('/plantas/update/:id', (req, res) => {
  const id = req.params.id;
  connection.query('SELECT * FROM planta WHERE id = ?', [id], (error, result) => {
    if (error) throw error;
    res.render('update', { planta: result[0] });
  });
});

// Update (POST)
app.post('/plantas/update/:id', async (req, res) => {
  const id = req.params.id;
  const { nome, temp_basal, gd } = req.body;
  const query = 'UPDATE planta SET nome = ?, temp_basal = ?, gd = ? WHERE id = ?';
  await connection.promise().query(query, [nome, temp_basal, gd, id]);
  res.redirect('/plantas');
});

// Delete

app.get('/plantas/delete/:id', (req, res) => {
  const id = req.params.id;
  connection.query('DELETE FROM planta WHERE id = ?', [id], (error) => {
    if (error) throw error;
    res.redirect('/plantas');
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
