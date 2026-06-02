const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/fa-gear"><\/i> <span>Settings<\/span>/g, 'fa-user-edit"></i> <span>Edit Profile</span>');
  content = content.replace(/English Mission Hub - Settings/g, 'English Mission Hub - Edit Profile');
  fs.writeFileSync(f, content);
});
console.log("Updated sidebars in " + files.length + " files.");
