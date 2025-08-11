const { exec } = require('child_process');

exec('yarn changeset version');
exec('yarn');