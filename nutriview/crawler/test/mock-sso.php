<?php
// Mock d'une app SPA derrière SSO, pour tester le crawler authentifié.
//   GET  /app          → si pas de cookie sess → 302 /login ; sinon SPA (JS).
//   GET  /login        → formulaire de connexion.
//   POST /login        → pose cookie sess=ok, redirige vers /app.
//   GET  /api/employes → 401 si pas de cookie ; sinon JSON (LA donnée réelle).
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$authed = isset($_COOKIE['sess']) && $_COOKIE['sess'] === 'ok';

if ($uri === '/login' && $method === 'POST') {
  setcookie('sess', 'ok', ['path' => '/', 'httponly' => true]);
  header('Location: /app', true, 302);
  return true;
}
if ($uri === '/login') {
  header('Content-Type: text/html; charset=utf-8');
  echo '<!doctype html><html><head><title>Connexion SSO</title></head><body>'
     . '<h1>Connexion</h1>'
     . '<form method="post" action="/login">'
     . '<input id="username" name="username" placeholder="Identifiant"/>'
     . '<input id="password" name="password" type="password" placeholder="Mot de passe"/>'
     . '<button id="submit" type="submit">Se connecter</button>'
     . '</form></body></html>';
  return true;
}
if ($uri === '/api/employes') {
  header('Content-Type: application/json');
  if (!$authed) { http_response_code(401); echo json_encode(['error' => 'unauthenticated']); return true; }
  echo json_encode([
    ['matricule' => 'E001', 'nomComplet' => 'Sara B.', 'numeroSecu' => '1850...', 'salaireBrut' => 4200, 'rib' => 'MA64...'],
    ['matricule' => 'E002', 'nomComplet' => 'Karim Z.', 'numeroSecu' => '1880...', 'salaireBrut' => 5100, 'rib' => 'MA64...'],
  ]);
  return true;
}
if ($uri === '/app' || $uri === '/') {
  if (!$authed) { header('Location: /login', true, 302); return true; }
  header('Content-Type: text/html; charset=utf-8');
  // SPA : la donnée n'est PAS dans le HTML, elle arrive par XHR après rendu.
  echo '<!doctype html><html><head><title>Espace RH</title></head><body>'
     . '<div id="root">Chargement…</div>'
     . '<script>'
     . 'fetch("/api/employes").then(r=>r.json()).then(list=>{'
     . '  document.getElementById("root").innerHTML = "<table><tr><th>Matricule</th><th>Nom</th></tr>" +'
     . '    list.map(e=>"<tr><td>"+e.matricule+"</td><td>"+e.nomComplet+"</td></tr>").join("") + "</table>";'
     . '});'
     . '</script></body></html>';
  return true;
}
http_response_code(404);
echo 'not found';
return true;
