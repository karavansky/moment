const pdf = require('pdf-parse');
const fs = require('fs');
let dataBuffer = fs.readFileSync('Profile.pdf');
pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('profile_text.txt', data.text);
    console.log('Successfully written to profile_text.txt');
});
