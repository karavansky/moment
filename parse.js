const fs = require('fs');

async function extract() {
    try {
        const { default: pdf } = await import('pdf-parse/lib/pdf-parse.js');
        const dataBuffer = fs.readFileSync('Profile.pdf');
        const data = await pdf(dataBuffer);
        fs.writeFileSync('profile_text.txt', data.text);
        console.log('Successfully extracted PDF');
    } catch(e) {
        console.error(e);
    }
}
extract();
