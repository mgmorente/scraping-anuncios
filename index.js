import puppeteer from "puppeteer";
import nodemailer from 'nodemailer';
import moment from 'moment';
import cron from 'node-cron';
import mysql from 'mysql';

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'scraping',
    charset: 'utf8'
});

async function handleDynamicWebPage() {
    const browser = await puppeteer.launch({
        headless: 'new',
    });
    const page = await browser.newPage();
    await page.goto("https://sede.cordoba.es/cordoba/tablon-de-anuncios/");
    const anuncios = await page.evaluate(() => {
        const anuncios = document.querySelectorAll("table.grid.card-list-table tr");
        const data = [...anuncios].map((anuncio) => {
            return [...anuncio.querySelectorAll("td")].map(
                (campo) => campo.hasAttribute('id') ? campo.getAttribute('id') : campo.innerText
            );
        });
        return data;
    });

    await browser.close();

    return anuncios;
}

function enviarMail(data) {


    
    

    let texto = '';

    for (let atributo in data) {
        texto += `${atributo}: ${data[atributo]}\n`;
    }
    

    // Configuración del transporte
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'cuenta.auxiliar.012@gmail.com',
            pass: 'kgpwxhxijrlnxkrw'
        }
    });

    // Detalles del correo electrónico
    const mailOptions = {
        from: 'cuenta.auxiliar.012@gmail.com',
        to: 'mgmorente@gmail.com',
        subject: 'Novedades sede Cordoba',
        text: texto
    };

    // Envío del correo electrónico
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log('Error al enviar el correo:', error);
        } else {
            console.log('Correo enviado correctamente:', info.response);
            const sql = 'UPDATE anuncios SET mail = 1 WHERE id = ?';
            connection.query(sql, data.id, (error, results, fields) => {
                if (error) {
                    console.error('Error al realizar la actualización:', error);
                } else {
                    console.log('Actualización exitosa. Filas afectadas:', results.affectedRows);
                }
            });
        }
    });
}

function updateData() {
    const sql = 'SELECT * FROM anuncios WHERE mail = false';
    connection.query(sql, (error, results, fields) => {
        if (error) {
            console.error('Error al ejecutar la consulta:', error);
        } else {
            results.forEach(result => {
                enviarMail(result);
            });
        }
    });
}

function saveData(data) {
    const sql = 'INSERT IGNORE INTO anuncios SET ?';

    for (const row of data) {
        if (row[5] === undefined) {
            continue;
        }

        let datos = {
            id: row[5],
            fecha: moment(row[0], "DD/MM/YYYY").format("YYYY-MM-DD"),
            asunto: row[1],
            asunto2: row[2],
            cuerpo: row[3],
            mail: false,
        };

        connection.query(sql, datos);
    };
}

async function procesar() {
    console.log('arranca...')

    connection.connect();

    const anuncios = await handleDynamicWebPage();
    await saveData(anuncios);
    await updateData(anuncios);



    connection.end();
}

// cron.schedule('0 * * * *', () => {
procesar();
// });
