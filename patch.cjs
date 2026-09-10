const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf-8');
const script = `
    <!-- Kill any lingering zombie Service Workers -->
    <script>
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          for(let registration of registrations) {
            registration.unregister();
            console.log('Unregistered zombie service worker');
          }
        });
      }
    </script>
`;
if (!html.includes('zombie Service Workers')) {
  html = html.replace('</head>', script + '  </head>');
  fs.writeFileSync('index.html', html);
}
