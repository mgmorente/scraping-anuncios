import puppeteer from "puppeteer";
import nodemailer from 'nodemailer';
import moment from 'moment';
import cron from 'node-cron';

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
                (campo) => campo.innerText
            );
        });
        return data[1];
    });

    let colFecha = data[0];
    colFecha = "20/06/2023";

    // Obtener la fecha actual
    const fechaActual = moment().startOf('day');

    // Crear la fecha de comparación
    const fechaComparacion = moment(colFecha, 'DD/MM/YYYY');

    // Verificar si es la fecha de hoy
    if (fechaComparacion.isSame(fechaActual, 'day')) {
        console.log("La fecha es la fecha de hoy.");
        enviarMail(data);
    } else {
        console.log("La fecha no es la fecha de hoy.");
    }

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
        }
    });
}

cron.schedule('0 * * * *', () => {
    handleDynamicWebPage();
});
