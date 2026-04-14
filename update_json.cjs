const fs = require('fs');

function updateJson(file) {
  const content = fs.readFileSync(file, 'utf8');
  const json = JSON.parse(content);

  if (!json.tracking.closeAria) {
      if (file.includes('en-US')) {
          json.tracking.closeAria = "Close tracking modal";
      } else {
          json.tracking.closeAria = "Cerrar modal de rastreo";
      }
      fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
      console.log(`Updated ${file}`);
  }
}

updateJson('src/messages/en-US/messages.json');
updateJson('src/messages/es-CR/messages.json');
