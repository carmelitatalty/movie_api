const express = require('express'),
  morgan = require('morgan'),
  fs = require('fs'), 
  path = require('path');

const app = express();

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {flags: 'a'})

app.use(morgan('combined', {stream: accessLogStream}));

app.use('/public', express.static('public'));

app.get('/movies', (req, res) => {
    const topMovies = [
        {
            name: 'The Hobbit: An Unexpected Journey',
            releaseYear: 2012
        },
        {
            name: 'The Hobbit: The Desolation of Smaug',
            releaseYear: 2013
        },
        {
            name: 'The Hobbit: The Battle of the Five Armies',
            releaseYear: 2014
        },
        {
            name: 'Lord of the Rings: The Fellowship of the Rings',
            releaseYear: 2001
        },
        {
            name: 'Lord of the Rings: The Return of the King',
            releaseYear: 2003
        },
        {
            name: 'Lord of the Rings: The Two Towers',
            releaseYear: 2002
        },
        {
            name: 'Reservoir Dogs',
            releaseYear: 1992
        },
        {
            name: 'You\'ve Got Mail',
            releaseYear: 1998
        },
        {
            name: 'Shawshank Redemption',
            releaseYear: 1994
        },
        {
            name: 'The Nightmare Before Christmas',
            releaseYear: 1993
        },
        {
            name: 'The Polar Express',
            releaseYear: 2004
        }
    ]

    res.json(topMovies)
})
app.get('/', (req, res) => {
    res.send('Nice try.')
})

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });

app.listen(8080, () => {
  console.log('Your app is listening on port 8080.');
});