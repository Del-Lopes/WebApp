<?php
/**
 * AFK Trade - BOLETA PRO License Verification API
 */

// --- 1. CONFIGURAÇÕES DO SUPABASE ---
$supabase_url = "https://armhlcnmaqgudqivkpgt.supabase.co"; 
$supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybWhsY25tYXFndWRxaXZrcGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NzkzODcsImV4cCI6MjA4NTA1NTM4N30.Ak1kG41SU72X-O3L8RVdxM4nZSMIG2sbJKt0HsZy8xs";
$table_name = "license_requests_boletapro"; // Base Boleta Pro

// --- 2. CAPTURA DE DADOS ---
$account_no = "";
if (!empty($_POST["account_no"])) {
    $account_no = $_POST["account_no"];
} elseif (!empty($_GET["account_no"])) {
    $account_no = $_GET["account_no"];
} else {
    $raw_body = file_get_contents('php://input');
    if (preg_match('/account_no=(\d+)/', $raw_body, $matches)) {
        $account_no = $matches[1];
    }
}

$account_no = (int)$account_no;
if (!$account_no) {
    die("Falha no login. Conta nao encontrada.");
}

// --- 3. CONSULTA DINÂMICA NO SUPABASE ---
$endpoint = $supabase_url . "/rest/v1/" . $table_name . "?mt5_account=eq." . $account_no . "&status=eq.approved&select=id,expires_at";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $endpoint);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "apikey: " . $supabase_key,
    "Authorization: Bearer " . $supabase_key,
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code === 200) {
    $data = json_decode($response, true);
    if (!empty($data)) {
        $license = $data[0];
        if (!empty($license['expires_at'])) {
            $dataExpiracao = new DateTime($license['expires_at']);
            $dataAtual = new DateTime();
            if ($dataAtual > $dataExpiracao) {
                die(" Falha no login. Licenca expirada."); 
            }
        }
        die("success"); 
    }
}

echo "Falha no login. Conta nao encontrada.";
?>
