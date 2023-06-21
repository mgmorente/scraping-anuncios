import puppeteer from "puppeteer";
import nodemailer from 'nodemailer';
import moment from 'moment';
import fs from 'fs';
import cron from 'node-cron';
import { createClient } from 'redis';

async function handleDynamicWebPage() {
    const browser = await puppeteer.launch({
        headless: 'new',
    });
    const page = await browser.newPage();
    await page.goto("https://sede.cordoba.es/cordoba/tablon-de-anuncios/");
    const data = await page.evaluate(() => {
        const anuncios = document.querySelectorAll("table.grid.card-list-table tr");
        const data = [...anuncios].map((anuncio) => {
            return [...anuncio.querySelectorAll("td")].map(
                (campo) => campo.hasAttribute('id') ? campo.getAttribute('id') : campo.innerText
            );
        });
        return data;
        // return data[1];
    });

    // enviarMail(data);
    saveData(data);

    await browser.close();
}

function enviarMail(data) {

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
        text: data.join('\n')
    };

    // Envío del correo electrónico
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log('Error al enviar el correo:', error);
        } else {
            console.log('Correo enviado correctamente:', info.response);
            saveData();
        }
    });
}

function procesar() {
    handleDynamicWebPage();
}



async function saveData(data) {

    const client = createClient({
        // url: 'redis://default:6GyoOSu8DwWisjzO6tec@containers-us-west-97.railway.app:7878'
        url: 'redis://:@127.0.0.1:6379'
    });

    client.on('error', err => console.log('Redis Client Error', err));

    await client.connect();
// console.log(data);

// array.forEach((elemento) => {
//     console.log(elemento);
//   });
  
    await client.set('anuncio',JSON.stringify(data));
    // const value = await client.get('key');
    await client.disconnect();

}

// cron.schedule('0 * * * *', () => {
procesar();
// });
