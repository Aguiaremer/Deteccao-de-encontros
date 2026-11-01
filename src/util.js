const fs = require('fs');
const readline = require('readline');

// Leitor especializado no formato fixo dos datasets do desafio.
async function lerCSV(caminhoArquivo) {
    return new Promise((resolve, reject) => {
        const resultados = [];
        const stream = fs.createReadStream(caminhoArquivo, { encoding: 'utf8' });
        const linhas = readline.createInterface({ input: stream, crlfDelay: Infinity });
        let primeiraLinha = true;

        stream.on('error', reject);
        linhas.on('line', (linha) => {
            if (primeiraLinha) {
                primeiraLinha = false; // pula o cabeçalho
                return;
            }
            if (!linha) return;

            const campos = linha.split(';');
            const timestamp = campos[2].replace(/^"|"$/g, '');
            const idsRestricao = (campos[6] || '').replace(/^"|"$/g, '');
            resultados.push({
                idMonitorado: Number(campos[0]),
                faccaoMonitorado: campos[1] ? Number(campos[1]) : null,
                timestamp,
                latitude: Number(campos[3]),
                longitude: Number(campos[4]),
                medidaProtetiva: campos[5] === 'true',
                idsRestricaoMedida: idsRestricao ? idsRestricao.split(',').map(Number) : []
            });
        });
        linhas.on('close', () => {
            console.log(`${resultados.length} registros processados`);
            resolve(resultados);
        });
        linhas.on('error', reject);
    });
}

// Função para ordenar os monitorados por timestamp, caso não estejam ordenados
function ordenarPorTimestamp(monitorados) {
    const jaOrdenado = monitorados.every((monitorado, i) => {
        if (i === 0) return true;
        return monitorados[i - 1].timestamp <= monitorado.timestamp;
    });

    if (jaOrdenado) {
        console.log('Os registros já estavam ordenados por timestamp');
        return monitorados;
    }
        
    console.log('Os registros não estavam ordenados. Realizando ordenação...');
    return [...monitorados].sort((a, b) => {
        return a.timestamp.localeCompare(b.timestamp);
    });
}

// Função para calcular a distância entre dois monitorados usando a fórmula de Haversine
function calcularDistancia(a, b) {
    const R = 6371000; // Raio da Terra em metros

    const radianos = graus => graus * Math.PI / 180;

    const lat1 = radianos(a.latitude);
    const lat2 = radianos(b.latitude);

    const deltaLat = radianos(b.latitude - a.latitude);
    const deltaLon = radianos(b.longitude - a.longitude);

    const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

    const distancia = 2 * R * Math.asin(Math.sqrt(h));

    return distancia;
}


module.exports = { lerCSV, ordenarPorTimestamp, calcularDistancia };
