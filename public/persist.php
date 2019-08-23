<?php

$authKey = $_POST['authKey'];
if (isset($_POST['domain'])) {
  $domain = $_POST['domain'];
  $title = $_POST['title'];
  $json = $_POST['json'];

  $domain = preg_replace('/[^\.A-Za-z0-9]/', '', $domain);
  $domain = preg_replace('/\.\./', '', $domain);

  $raw = json_decode($json);
  if (!$raw) {
    die('Invalid JSON: ' . json_last_error());
  }

} else {
  $remove = $_POST['remove'];

  $remove = preg_replace('/[^\.A-Za-z0-9]/', '', $remove);
  $remove = preg_replace('/\.\./', '', $remove);
}

$authKey = preg_replace('/[^A-Za-z0-9]/', '', $authKey);

$indexFile = 'sites/' . $authKey . '-index.json';
if (!file_exists($indexFile)) {
  die('Auth key is invalid');
}

$indexJson = json_decode(file_get_contents($indexFile));

if ($remove) {
  $siteFile = $remove . '.json';
  unset($indexJson->{$remove});
  $indexRaw = json_encode($indexJson);

  file_put_contents($indexFile, $indexRaw);
  unlink('sites/' . $siteFile);
} else {
  $siteFile = $domain . '.json';
  $indexJson->{$domain} = array(
    'title' => $title,
    'file' => $siteFile
  );

  $indexRaw = json_encode($indexJson);

  file_put_contents($indexFile, $indexRaw);
  file_put_contents('sites/' . $siteFile, $json);
}
echo 'OK';
