<?php

/**
 * Make the change for the request.
 *
 * @param array $args
 * - The arguments for this request.
 * @param array $indexJson
 * - The list of all sites.
 * @return array
 */
function perform_request_list($args, $indexJson) {
  $clients = [];
  $masterFile = 'sites/' . $args['authKey'] . '-index.json.master';

  // The site is a valid master so we can see other sites.
  if (file_exists($masterFile)) {
    foreach (glob('sites/*-index.json') as $indexFile) {
      $key = substr($indexFile, strlen('sites/'));
      $key = substr($key, 0, - strlen('-index.json'));
      array_push($clients, $key);
    }
  }
  
  return $clients;
}

/**
 * Make the change for the request.
 *
 * @param array $args
 * - The arguments for this request.
 * @param array $indexJson
 * - The list of all sites.
 * @return array
 */
function perform_request_add_client($args, $indexJson) {
  $indexFile = 'sites/' . $args['key'] . '-index.json';
  $empty = [];

  file_put_contents($indexFile, $empty);

  return true;
}

/**
 * Make the change for the request.
 *
 * @param array $args
 * - The arguments for this request.
 * @param array $indexJson
 * - The list of all sites.
 * @return array
 */
function perform_request_remove_client($args, $indexJson) {
  $masterFile = 'sites/' . $args['key'] . '-index.json.master';
  $indexFile = 'sites/' . $args['key'] . '-index.json';
  $empty = [];

  // Don't delete master lists.
  if (!file_exists($masterFile)) {
    unlink($indexFile);
  }

  return true;
}

/**
 * Make the change for the request.
 *
 * @param array $args
 * - The arguments for this request.
 * @param array $indexJson
 * - The list of all sites.
 * @return array
 */
function perform_request_add($args, $indexJson) {
  $indexFile = 'sites/' . $args['authKey'] . '-index.json';

  $siteFile = $args['domain'] . '.json';
  $indexJson->{$args['domain']} = array(
    'title' => $args['title'],
    'file' => $siteFile
  );

  $indexRaw = json_encode($indexJson);

  file_put_contents($indexFile, $indexRaw);
  file_put_contents('sites/' . $siteFile, $args['json']);

  return true;
}

/**
 * Make the change for the request.
 *
 * @param array $args
 * - The arguments for this request.
 * @param array $indexJson
 * - The list of all sites.
 * @return array
 */
function perform_request_remove($args, $indexJson) {
  $indexFile = 'sites/' . $args['authKey'] . '-index.json';
  $siteFile = $args['remove'] . '.json';
  unset($indexJson->{$args['remove']});
  $indexRaw = json_encode($indexJson);

  file_put_contents($indexFile, $indexRaw);
  unlink('sites/' . $siteFile);

  return true;
}

/**
 * Parse the post params for the remove client request.
 *
 * @return array
 */
function parse_request_remove_client() {
  $params = [];

  $params['authKey'] = $_POST['authKey'];
  $params['key'] = $_POST['key'];

  // Sanitise params.
  $params['authKey'] = preg_replace('/[^A-Za-z0-9]/', '', $params['authKey']);
  $params['key'] = preg_replace('/[^\.A-Za-z0-9]/', '', $params['key']);

  foreach ($params as $key => $value) {
    if (!$value) {
      die('Invalid parameters');
    }
  }
  return $params;
}

/**
 * Parse the post params for the add client request.
 *
 * @return array
 */
function parse_request_add_client() {
  $params = [];

  $params['authKey'] = $_POST['authKey'];
  $params['key'] = $_POST['key'];

  // Sanitise params.
  $params['authKey'] = preg_replace('/[^A-Za-z0-9]/', '', $params['authKey']);
  $params['key'] = preg_replace('/[^\.A-Za-z0-9]/', '', $params['key']);

  foreach ($params as $key => $value) {
    if (!$value) {
      die('Invalid parameters');
    }
  }
  return $params;
}

/**
 * Parse the post params for the add request.
 *
 * @return array
 */
function parse_request_add() {
  $params = [];

  $params['authKey'] = $_POST['authKey'];
  $params['domain'] = $_POST['domain'];
  $params['title'] = $_POST['title'];
  $params['json'] = $_POST['json'];
  $params['raw'] = json_decode($params['json']);

  // Sanitise params.
  $params['authKey'] = preg_replace('/[^A-Za-z0-9]/', '', $params['authKey']);
  $params['domain'] = preg_replace('/[^\.A-Za-z0-9]/', '', $params['domain']);
  $params['domain'] = preg_replace('/\.\./', '', $params['domain']);

  foreach ($params as $key => $value) {
    if (!$value) {
      die('Invalid parameters');
    }
  }
  return $params;
}

/**
 * Parse the post params for the list request.
 *
 * @return array
 */
function parse_request_list() {
  $params = [];

  $params['authKey'] = $_POST['authKey'];
  // Sanitise params.
  $params['authKey'] = preg_replace('/[^A-Za-z0-9]/', '', $params['authKey']);

  return $params;
}

/**
 * Read the index file json that contains all the sites.
 * @param string $authKey
 * - The authKey for this request.
 * @return array
 */
function read_index($authKey) {
  $indexFile = 'sites/' . $authKey . '-index.json';
  if (!file_exists($indexFile)) {
    die('Auth key is invalid');
  }

  return json_decode(file_get_contents($indexFile));
}

$action = '';
if (isset($_POST['action'])) {
  $action = $_POST['action'];
}
if (!$action) {
  die();
}

$parse = 'parse_request_' . $action;
$perform = 'perform_request_' . $action;

$args = $parse();

$indexJson = read_index($args['authKey']);

$response = $perform($args, $indexJson);

echo json_encode($response);
