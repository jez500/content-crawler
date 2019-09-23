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
 * Promote the "verify" request to a real account.
 *
 * @param array $args
 * - The arguments for this request.
 * @return array
 */
function perform_request_verify($args) {
  $clients = [];
  
  $verifyFile = 'sites/verify.json';
  $currentVerify = json_decode(file_get_contents($verifyFile));
  $validClient = false;

  foreach ($currentVerify as $index => $current) {
    if ($current->key == $args['authKey']) {
      $validClient = $current;
      unset($currentVerify[$index]);
    }
  }

  if (!$validClient) {
    // Just redirect - no changes.
    return header("Location: index.html");
  }

  // Create the index.
  $indexFile = 'sites/' . $args['authKey'] . '-index.json';
  $nosites = [];
  file_put_contents($indexFile, json_encode($nosites));

  // Save the contact details.
  $infoFile = 'sites/' . $args['authKey'] . '-info.json';
  file_put_contents($infoFile, json_encode($validClient));

  // Rewrite the verify list.
  $currentVerify = file_put_contents($verifyFile, json_encode($currentVerify));
  
  return header("Location: index.html");
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
  file_put_contents('sites/settings-' . $siteFile, $args['settings']);

  return true;
}

/**
 * Parse the post params for the remove request.
 *
 * @return array
 */
function parse_request_remove() {
  $params = [];

  $params['authKey'] = $_POST['authKey'];
  $params['remove'] = $_POST['remove'];

  // Sanitise params.
  $params['authKey'] = preg_replace('/[^A-Za-z0-9\-]/', '', $params['authKey']);
  $params['remove'] = preg_replace('/[^\.A-Za-z0-9\-]/', '', $params['remove']);
  $params['remove'] = preg_replace('/\.\./', '', $params['remove']);

  foreach ($params as $key => $value) {
    if (!$value) {
      die('Invalid parameters');
    }
  }
  return $params;
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
 * Generate a random string of safe characters.
 *
 * @param int $length
 * - The length for this string
 * @return string
 */
function generate_random_string($length = 10) {
    $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $charactersLength = strlen($characters);
    $randomString = '';
    for ($i = 0; $i < $length; $i++) {
        $randomString .= $characters[rand(0, $charactersLength - 1)];
    }
    return $randomString;
}

/**
 * Generate a random string of safe characters.
 *
 * @param string $source
 * @return string
 */
function obfuscate($source) {
  $pre = substr($source, 0, -6);
  $post = substr($source, -6);
  return $pre . str_rot13($post);
}

/**
 * Add this client to the "verify list".
 *
 * @param array $args
 * - The arguments for this request.
 * @return array
 */
function perform_request_new_client($args) {
  $verifyFile = 'sites/verify.json';
  $currentVerify = json_decode(file_get_contents($verifyFile));

  foreach ($currentVerify as $current) {
    if ($current->email == $args['email'] ||
        $current->company == $args['company'] ||
        $current->phone == $args['phone']) {
      // Client has already requested access.
      return false;
    }
  }

  // Add this to the pending list.
  $client = (object) $args;

  $client->clientid = strtolower(preg_replace("/[^A-Za-z0-9 ]/", '', $client->company));
  $client->key = $client->clientid . '-' . generate_random_string(6);
  array_push($currentVerify, $client);
  file_put_contents($verifyFile, json_encode($currentVerify));

  // Send them an email about it.
  $subject = 'Access to Website Crawler: ' . $client->company;

  // the message
  $msg = 'Dear ' . $client->firstName . ' ' . $client->lastName . "\n";
  $msg .= "\n";
  $msg .= "Thankyou for requesting access to the Website Crawler.\n";
  $msg .= "\n";
  $msg .= "An account has been created for you which will allow you to use\n";
  $msg .= "the application.\n";
  $msg .= "\n";
  $link = 'http';
  if(isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
    $link = 'https';
  }
  $link .= '://' . $_SERVER['HTTP_HOST'];
  $link .= '/persist.php?action=verify&authKey=' . obfuscate($client->key);
  $msg .= 'Follow this verification link to complete the process.' . "\n";
  $msg .= "\n";
  $msg .= $link;
  $msg .= "\n";
  $msg .= "\n";
  $msg .= 'Your login code for this site is: ' . $client->key . "\n";

  // use wordwrap() if lines are longer than 70 characters
  $msg = wordwrap($msg, 70);

  // send email
  mail($client->email, $subject, $msg);

  return true;
}

/**
 * Parse the post params for the new client contact.
 *
 * @return array
 */
function parse_request_new_client() {
  $params = [];
  $params['firstName'] = $_POST['firstName'];
  $params['lastName'] = $_POST['lastName'];
  $params['company'] = $_POST['company'];
  $params['email'] = $_POST['email'];
  $params['phone'] = $_POST['phone'];

  foreach ($params as $key => $value) {
    if (!$value) {
      die('Invalid parameters');
    }
  }
  return $params;
}

/**
 * Parse the post params for the verify account action.
 *
 * @return array
 */
function parse_request_verify() {
  $params = [];
  $params['authKey'] = obfuscate($_GET['authKey']);

  foreach ($params as $key => $value) {
    if (!$value) {
      die('Invalid parameters');
    }
  }
  return $params;
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
  $params['authKey'] = preg_replace('/[^A-Za-z0-9\-]/', '', $params['authKey']);
  $params['key'] = preg_replace('/[^\.A-Za-z0-9\-]/', '', $params['key']);

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
  $params['authKey'] = preg_replace('/[^A-Za-z0-9\-]/', '', $params['authKey']);
  $params['key'] = preg_replace('/[^\.A-Za-z0-9\-]/', '', $params['key']);

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
  $params['settings'] = $_POST['settings'];
  $params['raw'] = json_decode($params['json']);

  // Sanitise params.
  $params['authKey'] = preg_replace('/[^A-Za-z0-9\-]/', '', $params['authKey']);
  $params['domain'] = preg_replace('/[^\.A-Za-z0-9\-]/', '', $params['domain']);
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
  $params['authKey'] = preg_replace('/[^A-Za-z0-9\-]/', '', $params['authKey']);

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
} else if (isset($_GET['action'])) {
  if ($_GET['action'] == 'verify') {
    $action = $_GET['action'];
  }
}
if (!$action) {
  die();
}

$parse = 'parse_request_' . $action;
$perform = 'perform_request_' . $action;

$args = $parse();

if ($action == 'new_client' || $action = 'verify') {
  $response = $perform($args);
} else {
  $indexJson = read_index($args['authKey']);
  $response = $perform($args, $indexJson);
}

echo json_encode($response);
