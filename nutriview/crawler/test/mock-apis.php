<?php
// Mocks d'APIs authentifiées pour tester les connecteurs NutriView Connect.
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$hdrs = function_exists('getallheaders') ? getallheaders() : [];
$auth = '';
foreach ($hdrs as $k => $v) { if (strtolower($k) === 'authorization') $auth = $v; }
$bearer = (strpos($auth, 'Bearer ') === 0) ? substr($auth, 7) : '';
function j($x){ header('Content-Type: application/json'); echo json_encode($x); }

// ---- Salesforce ----
if ($uri === '/services/oauth2/token' && $method === 'POST') {
  // grant_type=password → access_token (mock).
  j(['access_token' => 'SFTOKEN', 'instance_url' => 'http://127.0.0.1:9975', 'token_type' => 'Bearer']);
  return true;
}
if ($uri === '/services/data/v59.0/sobjects/') {
  if ($bearer !== 'SFTOKEN') { http_response_code(401); j(['error' => 'unauth']); return true; }
  j(['sobjects' => [['name' => 'Account'], ['name' => 'Contact']]]);
  return true;
}
if ($uri === '/services/data/v59.0/sobjects/Account/describe') {
  if ($bearer !== 'SFTOKEN') { http_response_code(401); j(['error' => 'unauth']); return true; }
  j(['fields' => [
    ['name' => 'Name', 'label' => 'Account Name', 'type' => 'string'],
    ['name' => 'AnnualRevenue', 'label' => 'Annual Revenue', 'type' => 'currency'],
    ['name' => 'Industry', 'label' => 'Industry', 'type' => 'picklist'],
  ]]);
  return true;
}
if ($uri === '/services/data/v59.0/sobjects/Contact/describe') {
  if ($bearer !== 'SFTOKEN') { http_response_code(401); j(['error' => 'unauth']); return true; }
  j(['fields' => [
    ['name' => 'Email', 'label' => 'Email', 'type' => 'email'],
    ['name' => 'Phone', 'label' => 'Phone', 'type' => 'phone'],
  ]]);
  return true;
}

// ---- OpenAPI protégé par Bearer ----
if ($uri === '/secure/openapi.json') {
  if ($bearer !== 'APITOKEN') { http_response_code(401); j(['error' => 'unauth']); return true; }
  j(['openapi' => '3.0.0', 'components' => ['schemas' => [
    'Facture' => ['properties' => ['numero' => ['type' => 'string'], 'montantTTC' => ['type' => 'number', 'description' => 'Montant TTC']]],
  ]]]);
  return true;
}

// ---- GraphQL introspection protégé par Bearer ----
if ($uri === '/graphql' && $method === 'POST') {
  if ($bearer !== 'APITOKEN') { http_response_code(401); j(['error' => 'unauth']); return true; }
  j(['data' => ['__schema' => ['types' => [
    ['kind' => 'OBJECT', 'name' => 'Patient', 'fields' => [['name' => 'nom'], ['name' => 'dossierMedical']]],
    ['kind' => 'OBJECT', 'name' => 'Query', 'fields' => [['name' => 'patients']]],
    ['kind' => 'SCALAR', 'name' => 'String', 'fields' => null],
  ]]]]);
  return true;
}

http_response_code(404);
j(['error' => 'not found']);
return true;
