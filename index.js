import puppeteer from "puppeteer";
import nodemailer from 'nodemailer';

async function handleDynamicWebPage() {
    const browser = await puppeteer.launch({
        headless: 'new',
    });
    const page = await browser.newPage();
    await page.goto("https://sede.cordoba.es/cordoba/tablon-de-anuncios/");
    const data = await page.evaluate(() => {
        const anuncios = document.querySelectorAll("table.grid.card-list-table tr");
        const data = [...anuncios].map((anuncio) => {
            const campos = [...anuncio.querySelectorAll("td")].map(
                (campo) => campo.innerText
            );
            return {
                campos,
            };
        });
        return data;
    });

    enviarMail(data[1]);
    console.log(data[1]);
    await browser.close();
}

function enviarMail(data) {
    // Configuración del transporte
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'cuenta.auxiliar.012@gmail.com',
            pass: '18121956'
        }
    });

    // Detalles del correo electrónico
    const mailOptions = {
        from: 'cuenta.auxiliar.012@gmail.com',
        to: 'mgmorente@gmail.com',
        subject: 'Novedades sede Cordoba',
        text: data
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

handleDynamicWebPage();