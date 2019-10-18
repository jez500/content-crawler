<?php

if (!file_exists('urls.json')) {
  file_put_contents('urls.json', json_encode(['token' => 'url']));
}

$all = json_decode(file_get_contents('urls.json'));

$token = isset($_GET['token'])?$_GET['token']:'';

if ($token) {
  if (isset($all->$token)) {
    header('Location: http://crawler.dvm.local/' . $all->$token);
  } else {
    http_response_code(404);
  }
} else {
  $url = $_POST['url'];
  $token = $_POST['token'];
  if ($url) {
    $all->$token = $url;
    file_put_contents('urls.json', json_encode($all));
    $short = "http://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]?token=$token";
    echo json_encode($short);
  } else {
    http_response_code(404);
  }
}
