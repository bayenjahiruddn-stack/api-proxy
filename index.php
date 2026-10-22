<?php
header('Content-Type: application/json');

$firebaseURL = "https://dripwire-f541e-default-rtdb.asia-southeast1.firebasedatabase.app/random_keys";
$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action == 'verify') {
    $userKey = isset($_GET['key']) ? $_GET['key'] : '';
    
    if (empty($userKey)) {
        echo json_encode(["status" => "error", "message" => "Key is missing"]);
        exit;
    }

    $url = $firebaseURL . "/" . $userKey . ".json";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($response, true);

    if ($data) {
        echo json_encode(["status" => "success", "data" => $data]);
    } else {
        echo json_encode(["status" => "error", "message" => "Invalid Key"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Invalid Action"]);
}
?>
