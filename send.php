<?php
// Tar emot kontaktformuläret, sparar förfrågan i leads/ och mejlar Agmenta direkt.
declare(strict_types=1);

const RECIPIENTS = ['andreas.ozbek@agmenta.se', 'magnus.westerberg@agmenta.se'];
const SENDER = 'webb@agmenta.se';
const LEADS_DIR = __DIR__ . '/leads';
const TYPES = ['Hotell', 'Fastighet/er', 'Verksamhet', 'Samarbetspartner'];
const MAX_PER_HOUR = 5;
// Filerna i leads/ börjar med den här raden, så de visar ingenting om någon öppnar dem
// i webbläsaren. Skyddet gäller även om servern struntar i leads/.htaccess.
const GUARD = "<?php exit; ?>\n";

$wantsJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

function respond(bool $ok, bool $json, int $status = 200): void
{
    if ($json) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok]);
    } else {
        header('Location: ./?' . ($ok ? 'skickat=1' : 'fel=1') . '#formular', true, 303);
    }
    exit;
}

function readGuarded(string $file): string
{
    return is_file($file) ? substr((string)file_get_contents($file), strlen(GUARD)) : '';
}

function field(string $key, int $max = 120): string
{
    $value = (string)($_POST[$key] ?? '');
    $value = preg_replace('/[\r\n\t]+/', ' ', $value);
    return trim(mb_substr($value, 0, $max));
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(false, $wantsJson, 405);
}

// Fällan för spambotar: låtsas att allt gick bra
if (!empty($_POST['webbplats'])) {
    respond(true, $wantsJson);
}

$typ = in_array($_POST['typ'] ?? '', TYPES, true) ? $_POST['typ'] : 'Övrigt';
$namn = field('namn');
$foretag = field('foretag');
$telefon = field('telefon', 40);
$epost = filter_var(field('epost', 160), FILTER_VALIDATE_EMAIL) ?: '';
$ort = field('ort');
$pris = isset($_POST['pris']) && $_POST['pris'] !== '' ? max(0, min(250, (int)$_POST['pris'])) : null;
$meddelande = trim(mb_substr((string)($_POST['meddelande'] ?? ''), 0, 4000));
$samtycke = ($_POST['samtycke'] ?? '') === 'ja';

if ($namn === '' || $telefon === '' || $epost === '' || !$samtycke) {
    respond(false, $wantsJson, 422);
}

if (!is_dir(LEADS_DIR)) {
    mkdir(LEADS_DIR, 0750, true);
}

// Enkel spärr mot massutskick från samma adress
$ipHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . __FILE__);
$rateFile = LEADS_DIR . '/rate.php';
$rate = json_decode(readGuarded($rateFile), true) ?: [];
$now = time();
$rate = array_filter($rate, fn($t) => $now - $t < 3600);
$recent = array_filter($rate, fn($t, $k) => str_starts_with((string)$k, $ipHash), ARRAY_FILTER_USE_BOTH);
if (count($recent) >= MAX_PER_HOUR) {
    respond(false, $wantsJson, 429);
}
$rate[$ipHash . '-' . $now . '-' . mt_rand()] = $now;
file_put_contents($rateFile, GUARD . json_encode($rate), LOCK_EX);

$lead = [
    'tid' => date('c'),
    'typ' => $typ,
    'pris_msek' => $pris,
    'namn' => $namn,
    'foretag' => $foretag,
    'telefon' => $telefon,
    'epost' => $epost,
    'ort' => $ort,
    'meddelande' => $meddelande,
];
$leadsFile = LEADS_DIR . '/leads.php';
if (!is_file($leadsFile)) {
    file_put_contents($leadsFile, GUARD, LOCK_EX);
}
file_put_contents(
    $leadsFile,
    // JSON_HEX_TAG gör om < och > så att ingen kan smyga in PHP-kod via formuläret
    json_encode($lead, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) . "\n",
    FILE_APPEND | LOCK_EX
);

$subject = 'Ny förfrågan: ' . $typ . ($pris !== null ? ', ' . $pris . ' MSEK' : '') . ', ' . $namn;
$body = implode("\n", [
    'Ärende: ' . $typ,
    'Pris: ' . ($pris !== null ? $pris . ' MSEK' : '-'),
    'Ort: ' . ($ort ?: '-'),
    '',
    'Namn: ' . $namn,
    'Företag: ' . ($foretag ?: '-'),
    'Telefon: ' . $telefon,
    'E-post: ' . $epost,
    '',
    $meddelande ?: '(inget meddelande)',
    '',
    'Skickat från agmenta.se ' . date('Y-m-d H:i'),
]);
$headers = [
    'From' => 'Agmenta webb <' . SENDER . '>',
    'Reply-To' => $epost,
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8',
    'Content-Transfer-Encoding' => '8bit',
];
mail(implode(',', RECIPIENTS), '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);

// Förfrågan är sparad även om mejlet skulle fastna
respond(true, $wantsJson);
