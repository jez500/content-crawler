<?php

$fp = fopen('urls.lock', 'r+');
$lock = flock($fp, LOCK_EX);

if (!file_exists('urls.json')) {
  file_put_contents('urls.json', json_encode(['token' => 'url']));
}

$all = json_decode(file_get_contents('urls.json'));

$token = isset($_GET['token']) ? $_GET['token'] : '';

if ($token) {
  if (isset($all->$token)) {
    $headers = get_headers($all->$token);
    foreach ($headers as $header) {
      header($header);
    }
    readfile($all->$token);
  } else {
    http_response_code(404);
  }
} else {
  $url = isset($_POST['url']) ? $_POST['url'] : '';
  $token = isset($_POST['token']) ? $_POST['token'] : '';
  if ($url) {
    $all->$token = $url;
    file_put_contents('urls.json', json_encode($all, JSON_PRETTY_PRINT));
    $short = "http://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]?token=$token";
    echo json_encode($short);
  } else {
    http_response_code(404);
  }
}

fclose($fp);
