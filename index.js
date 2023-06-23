import puppeteer from "puppeteer";
import nodemailer from 'nodemailer';
import moment from 'moment';
import cron from 'node-cron';
import mysql from 'mysql2';

// const connection = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: '',
//   database: 'scraping',
//   charset: 'utf8'
// });

const connection = mysql.createConnection({
  host: 'containers-us-west-195.railway.app',
  user: 'root',
  password: 's0r8cxPh5MOLD3uHXYQR',
  database: 'railway',
  port: 5549,
  charset: 'utf8'
});

// scraping de la web
// retorna todos los anuncios
async function handleDynamicWebPage() {
  const browser = await puppeteer.launch({
    headless: 'new',
  });
  const page = await browser.newPage();
  await page.goto("https://sede.cordoba.es/cordoba/tablon-de-anuncios/");
  const anuncios = await page.evaluate(() => {
    const anuncios = document.querySelectorAll("table.grid.card-list-table tr");
    return [...anuncios].map(anuncio => {
      return [...anuncio.querySelectorAll("td")].map(campo => (
        campo.hasAttribute('id') ? campo.getAttribute('id') : campo.innerText
      ));
    });
  });

  await browser.close();

  return anuncios;
}

// realiza el envio de cada nuevo anuncio o sin comunicar
function enviarMail(data) {
  const { id, fecha, asunto, asunto2, cuerpo } = data;

  return new Promise((resolve, reject) => {
    const texto = Object.entries({ id, fecha, asunto, asunto2, cuerpo })
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'cuenta.auxiliar.012@gmail.com',
        pass: 'kgpwxhxijrlnxkrw'
      }
    });

    const mailOptions = {
      from: 'cuenta.auxiliar.012@gmail.com',
      to: 'mgmorente@gmail.com',
      subject: 'Novedades sede Cordoba',
      text: texto
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar el correo:', error);
        reject(error);
      } else {
        console.log('Correo enviado correctamente:', info.response);
        resolve(true);
      }
    });
  });
}

// retorna los anuncios sin enviar
async function selectData() {
  const sql = 'SELECT * FROM anuncios WHERE mail = false';

  return new Promise((resolve, reject) => {
    connection.query(sql, (error, results) => {
      if (error) {
        console.error('Error al ejecutar la consulta:', error);
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

// se graba todos los anuncios, se ignoran aquellos ya existentes
async function saveData(data) {
  const sql = 'INSERT IGNORE INTO anuncios SET ?';

  for (const row of data) {
    const [fecha, asunto, asunto2, cuerpo, , id] = row;

    if (id) {
      const datos = {
        id,
        fecha: moment(fecha, "DD/MM/YYYY").format("YYYY-MM-DD"),
        asunto,
        asunto2,
        cuerpo,
        mail: false,
      };

      connection.query(sql, datos);
    }
  }
}

// se marca el anuncio enviado correctamente
function update(data) {
  const sql = 'UPDATE anuncios SET mail = 1 WHERE id = ?';

  return new Promise((resolve, reject) => {
    connection.query(sql, data.id, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(true);
      }
    });
  });
}

async function procesar() {
  try {
    // conexion bd
    await connection.connect();
    // scraping
    const anuncios = await handleDynamicWebPage();
    // registro anuncios
    await saveData(anuncios);
    // anuncios nuevos / sin enviar
    const results = await selectData();
    console.log('Registros nuevos:', results.length);
    for (const result of results) {
      // enviar anuncios nuevos
      if (await enviarMail(result)) {
        // marcar como enviados
        await update(result);
      }
    }
    // cerrar conexion bd
    connection.end((error) => {
      if (error) {
        console.log('Error al cerrar la conexión:', error);
      }
    });
  } catch (error) {
    console.error('Ocurrió un error en el procesamiento:', error);
  }
}

// cron cada hora
cron.schedule('0 * * * *', () => {
  procesar();
});
