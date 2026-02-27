const fs = require('fs');
const pdf = require('pdf-parse');
let dataBuffer = fs.readFileSync('Profile.pdf');
pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('profile_text.txt', data.text);
    console.log('Successfully parsed PDF to profile_text.txt');
}).catch(function(error){
    console.error("Error parsing PDF:", error);
});
