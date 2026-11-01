const { lerCSV, ordenarPorTimestamp, calcularDistancia } = require('./util');
const path = require('path');
const fs = require('fs');

async function main() {
    try {
        const inicioExecucao = process.hrtime.bigint();
        // Verifica se o arquivo CSV foi informado como argumento
        const Arquivo = process.argv[2];
        if (!Arquivo) {
            throw new Error('Informe o arquivo CSV.');
        }

        // Define os caminhos de entrada e saída dos arquivos
        const inputPath = path.resolve(__dirname, `../data/inputs/${Arquivo}.txt`);
        const outputPath = path.resolve(__dirname,`../data/outputs/output_${Arquivo}.json`);

        // Lê o arquivo CSV e armazena os dados em um array de objetos
        const inicioLeitura = process.hrtime.bigint();
        let monitorados = await lerCSV(inputPath);
        const fimLeitura = process.hrtime.bigint();

        // Ordena os monitorados por timestamp e cria os buckets
        const inicioPreparacao = process.hrtime.bigint();
        monitorados = ordenarPorTimestamp(monitorados);
        const buckets = criarBuckets(monitorados);
        const fimPreparacao = process.hrtime.bigint();

        // Realiza a busca por encontros entre os monitorados dentro de cada bucket
        const inicioBusca = process.hrtime.bigint();
        const encontros = [];
        for (const bucket of buckets) {
            for (let i = 0; i < bucket.length; i++) {
                for (let j = i + 1; j < bucket.length; j++) {
                    const distancia = calcularDistancia(bucket[i], bucket[j]);
                    if (distancia < 20) {
                        encontros.push(encontroDetectado(bucket[i], bucket[j], distancia));
                    }
                }
            }
        }
        const fimBusca = process.hrtime.bigint();
        
        // Grava os encontros encontrados em um arquivo JSON
        const inicioGravacao = process.hrtime.bigint();
        fs.writeFileSync(
            outputPath,
            JSON.stringify(encontros, null, 2)
        );
        console.log('Arquivo JSON gerado com sucesso');
        const fimExecucao = process.hrtime.bigint();

        // Exibe os tempos de execução das etapas do processo
        console.log(`Tempo de leitura: ${(Number(fimLeitura - inicioLeitura) / 1e9).toFixed(3)} s`);
        console.log(`Tempo de preparação: ${(Number(fimPreparacao - inicioPreparacao) / 1e9).toFixed(3)} s`);
        console.log(`Tempo de busca: ${(Number(fimBusca - inicioBusca) / 1e9).toFixed(3)} s`);
        console.log(`Tempo de gravação: ${(Number(fimExecucao - inicioGravacao) / 1e9).toFixed(3)} s`);
        console.log(`Tempo total: ${(Number(fimExecucao - inicioExecucao) / 1e9).toFixed(3)} s`);

    } catch (erro) {
        console.error(erro);
    }
}

// Função de processamento de um encontro detectado entre dois monitorados, considerando a distância e o tipo de relação entre eles (facção, medida protetiva ou genérico)
function encontroDetectado(monitoradoA, monitoradoB, distancia) {
    const idMonitoradoA = monitoradoA.idMonitorado;
    const idMonitoradoB = monitoradoB.idMonitorado;
    let tipo = '';

    if(monitoradoA.faccaoMonitorado && monitoradoB.faccaoMonitorado && 
        (monitoradoA.faccaoMonitorado == monitoradoB.faccaoMonitorado)) {
        tipo = 'faccao';
    }
    else if ((monitoradoA.medidaProtetiva && monitoradoA.idsRestricaoMedida.includes(monitoradoB.idMonitorado)) ||
                (monitoradoB.medidaProtetiva && monitoradoB.idsRestricaoMedida.includes(monitoradoA.idMonitorado))) {
        tipo = 'protetiva';
    }
    else {
        tipo = 'generico';
    }

    return {
        tipo: tipo,
        monitoradosEncontro: [idMonitoradoA, idMonitoradoB],
        timestamp: monitoradoA.timestamp,
        posicoes: {
            [idMonitoradoA]: { lat: monitoradoA.latitude, lon: monitoradoA.longitude },
            [idMonitoradoB]: { lat: monitoradoB.latitude, lon: monitoradoB.longitude }
        },
        distanciaMetros: distancia
    };
}

// Função para criar buckets de monitorados com o mesmo timestamp
function criarBuckets(monitorados) {
    const buckets = [];
    for (let i = 0; i < monitorados.length; i++) {
        const bucket = [];
        while (monitorados[i].timestamp == monitorados[i + 1]?.timestamp) {
            bucket.push(monitorados[i]);
            i++;
        }
        bucket.push(monitorados[i]);
        buckets.push(bucket);
    }
    console.log(`Foram criados ${buckets.length} buckets`);
    return buckets;
}

main();
