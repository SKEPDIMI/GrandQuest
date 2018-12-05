const fs = require('fs');
const path = require('path');
const express = require('express');

require('dotenv').config();

const redisClient = require('./lib/redisClient');
redisClient.flushdb((err, res) => {
  if (err || !res) {
    console.log('$ REDIS: FAILED TO FLUSH CACHE => ', err);
  } else {
    console.log('$ REDIS: flushed cache');
  }
})

const app = express();

app.use(express.static('./client'));

app.get('/', (req, res) => {
  console.log('$ SERVER: get /');

  getTemplate({ title: 'Home', htmlFileName: 'index.html' },  ({status, html}) => {
    console.log('$ SERVER: getTemplate => ', { status });

    res.status(status).send(html);
  });
});

app.get('/about', (req, res) => {
  getTemplate({ title: 'About' }, ({ status, html}) => {
    res.status(status).send(html);
  });
});

app.get('/devlog', (req, res) => {
  getTemplate({ title: 'DevLog' }, ({ status, html }) => {
    res.status(status).send(html);
  });
});

app.get('*', (req, res) => {
  res.status(404).send('404!');
});

const getTemplate = (options, cb) => {
  let title = typeof options.title =='string' && options.title.trim().length > 0 ? options.title.trim() : false

  if (!title && !htmlFileName) return cb({ status: 404, html: 'not found' });

  let htmlFileName = typeof options.htmlFileName == 'string' && options.htmlFileName.trim().length > 5 ? options.htmlFileName.trim() : `${title.trim().toLowerCase()}.html`

  if (!htmlFileName) {
    return cb({ status: 404, html: 'not found' });
  }

  // find cached template
  redisClient.get(htmlFileName, (err, val) => {
    console.log('$ REDIS: get ', title + ' => ' + !!val);
    let template = val;

    if(!val || err) {
      template = generateTemplate(title, htmlFileName);
    }

    cb({ status: 200, html: template });
  });
}
const generateTemplate = (title, fileName) => {
  const htmlTitle = typeof title == 'string' && title.trim().length > 0 ? title.trim() : false
  const fileDir = path.join(__dirname, 'client', 'views', fileName);

  const HTML = fs.readFileSync(fileDir) || '404';

  const template = `
    <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet"> 
        
        ${ htmlTitle ? `<link rel="stylesheet" href="../dist/css/${htmlTitle.toLowerCase()}.css">` : '' }
        <link rel="stylesheet" href="../dist/css/styles.css">
        <title>${ htmlTitle ? `GrandQuest - ${htmlTitle}` : 'GrandQuest - RPG / Multiplayer' }</title>
      </head>
      <body>
        <div class="root">
          <div class="main-header">
            <div class="main-header__content">
              <a title="looking for a logo!" href="/" id="title">GRANDQUEST</a>
              <div class="main-header__navigation">
                <a href="forum">Forum</a>
                <a href="signup">Register</a>
                <a href="login">Log In</a>
              </div>
            </div>
            <div class="main-header__sub">
              <a href="about">about</a>
              <a href="contributing">contributing</a>
              <a href="devlog">Dev Log</a>
            </div>
          </div>
          ${HTML}
        </div>
      </body>
    </html>
  `

  console.log('$ REDIS: set ', fileName);

  redisClient.set(fileName, template, 'EX', 60 * 60);

  return template
}

const PORT = process.env.PORT || 8080

app.listen(PORT, () => {
  console.log('$ SERVER: listening at port ', PORT)
});
