# Desafio: Detecção de Encontros

Aplicação em Node.js que lê posicionamentos de pessoas monitoradas, encontra pares próximos no mesmo timestamp e gera um arquivo JSON com os encontros detectados.

## Requisitos

- Node.js instalado.
- Os arquivos de entrada `.txt` na pasta `data/inputs`.

O projeto não precisa de dependências externas para ler o CSV: o leitor usado atualmente é próprio e utiliza módulos nativos do Node.js.

## Estrutura do projeto

```text
Deteccao de encontros/
├── data/
│   ├── inputs/                 # Datasets de entrada (.txt)
│   │   ├── dataset1.txt
│   │   └── ...
│   └── outputs/                # JSONs gerados pelo programa
├── src/
│   ├── main.js                 # Fluxo principal e detecção dos encontros
│   └── util.js                 # Leitura, ordenação e cálculo de distância
├── package.json
└── README.md
```

Cada entrada deve estar em `data/inputs` e seguir o formato separado por ponto e vírgula:

```text
idMonitorado;faccaoMonitorado;timestamp;latitude;longitude;medidaProtetiva;idsRestricaoMedida
```

O leitor considera o formato dos datasets do desafio: timestamp entre aspas e nenhum ponto e vírgula dentro dos campos entre aspas. IDs de restrição podem vir entre aspas, por exemplo `"10"` ou `"10,11"`.

## Como executar

Abra o terminal na pasta raiz do projeto (`Deteccao de encontros`) e informe o nome do dataset, sem a extensão `.txt`:

```powershell
node .\src\main.js dataset1
```

Também é possível executar estando dentro da pasta `src`:

```powershell
node main.js dataset2
```

O programa procura automaticamente o arquivo correspondente em `data/inputs`. Por exemplo, `dataset2` corresponde a `data/inputs/dataset2.txt`. O resultado será gravado em `data/outputs/output_dataset2.json`.

Durante a execução, o terminal informa os tempos de leitura, preparação, busca e gravação, além do tempo total.

## Lógica utilizada

1. O programa lê o arquivo em fluxo, linha por linha, converte os campos para os tipos usados pelo algoritmo e guarda os registros em memória.
2. Verifica se os registros já estão ordenados pelo timestamp. Se não estiverem, ordena-os. Essa ordenação é necessária para reunir corretamente os registros de cada horário em um bucket.
3. Cria um bucket para cada timestamp. Cada bucket contém somente posições daquele horário.
4. Compara todos os pares dentro de cada bucket. Não compara posições de timestamps diferentes.
5. Calcula a distância entre cada par usando a fórmula de Haversine e o raio terrestre de 6.371.000 metros. Só considera encontro quando a distância é **menor que 20 metros**.
6. Classifica o encontro. O código verifica primeiro se os dois monitorados têm a mesma facção; em seguida, verifica se existe uma restrição protetiva entre eles; se nenhuma dessas condições se aplicar, classifica como genérico. Portanto, se um par satisfizer tanto a regra de facção quanto a protetiva, a classificação atual será `faccao`.
7. Grava os encontros em `data/outputs/output_<dataset>.json`, incluindo tipo, IDs, timestamp, posições e distância.

## Análise de desempenho

Se `n` for o número total de registros e `kₜ` o número de registros no timestamp `t`, a busca compara:

```text
Σ kₜ(kₜ − 1) / 2
```

Assim, o custo da busca é **O(Σ kₜ²)**. No pior caso (se todos os `n` registros tiverem o mesmo timestamp) esse custo chega a **O(n²)**. Esse método pode ser ruim quando há muitos registros concentrados no mesmo horário, pois cada par daquele grupo será examinado.

As outras etapas custam O(n) para leitura, verificação de ordenação e criação dos buckets. Se os dados não estiverem ordenados, a ordenação custa O(n log n). Portanto, o custo total é O(n log n + Σ kₜ²) no caso não ordenado, e O(n + Σ kₜ²) quando a entrada já vem ordenada. A memória é O(n + m), em que `m` é a quantidade de encontros emitidos: os registros e buckets são mantidos em memória, assim como os encontros antes da gravação.

### Por que foi escolhida a busca por pares

Também foi avaliado o **Spatial Hashing**: dividir as coordenadas em células espaciais e comparar cada posição apenas com as posições de células vizinhas. Em teoria, essa estratégia pode reduzir bastante os cálculos de distância quando há poucos candidatos próximos.

Nos testes com os datasets deste desafio, porém, a grade global precisava armazenar índices para milhões de posições além dos registros que já estavam carregados. No dataset 7, com 12 milhões de registros, o Node.js chegou ao limite de heap de aproximadamente 4 GB e encerrou com `JavaScript heap out of memory`.

Também foi testada uma grade separada por timestamp. Essa alternativa evitava o consumo da grade global, mas precisava criar a grade para cada bucket. Nos benchmarks realizados, esse custo não compensou a redução de comparações. A busca original por pares foi mais rápida nos datasets testados; por exemplo, no dataset 7, a busca antiga levou uma media de 26 segundos, contra a media de 38 segundos na versão com grade por timestamp. Por isso, a solução entregue mantém a busca por pares, que foi a mais rápida na prática para esses dados e não excedeu o limite de memória nos testes.

## Otimização da leitura

No início, o projeto usava a biblioteca `csv-parser`. A medição separada das etapas mostrou que a leitura era um gargalo. Como o formato dos arquivos é fixo, o leitor foi substituído por um leitor próprio que processa o arquivo em fluxo, separa cada linha por `;` e converte os campos necessários.

No dataset 7, essa alteração reduziu o tempo de leitura de aproximadamente 15 segundos para 8 segundos. O leitor continua usando fluxo para evitar carregar o arquivo bruto inteiro como uma única string, embora os registros já interpretados sejam mantidos em memória para a ordenação, o agrupamento e a busca.
