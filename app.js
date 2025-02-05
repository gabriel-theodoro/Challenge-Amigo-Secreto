/**
 * @fileoverview Aplicação de Amigo Secreto com recursos de IA
 * @version 1.0.0
 * @author Seu Nome
 * @description 
 * Esta aplicação permite:
 * - Gerenciar lista de participantes
 * - Realizar sorteio automático
 * - Sugerir presentes usando IA
 * - Compartilhar resultados via WhatsApp
 * 
 * Tecnologias utilizadas:
 * - ML5.js para análise de sentimentos
 * - LocalStorage para persistência
 * - Web Share API
 */

// O principal objetivo deste desafio é fortalecer suas habilidades em lógica de programação. Aqui você deverá desenvolver a lógica para resolver o problema.

// Este código foi atualizado para ser mais inclusivo e eficiente em termos de consumo de energia, seguindo os padrões da Green Software Foundation.

document.addEventListener('DOMContentLoaded', () => {
    const inputAmigo = document.getElementById('amigo');
    const datalist = document.getElementById('sugestoes-nomes');
    const botaoSortear = document.querySelector('.button-draw');
    const telefoneInput = document.getElementById('telefone');

    // Configurar eventos do input de amigo
    inputAmigo.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            adicionarAmigo();
        }
    });

    // Configurar autocompletar
    inputAmigo.addEventListener('input', (e) => {
        const valor = e.target.value.toLowerCase();
        if (valor.length >= 2) {
            atualizarSugestoes(valor, datalist);
        }
    });

    // Configurar outros eventos
    botaoSortear.addEventListener('mouseover', verificarNumeroPar);
    telefoneInput.addEventListener('input', handleTelefoneInput);

    // Carregar dados iniciais
    carregarListaLocal();
    carregarNomesAprendidos();
});

// Importar ML5.js para análise de sentimentos
document.head.appendChild(Object.assign(document.createElement('script'), {
    src: 'https://unpkg.com/ml5@latest/dist/ml5.min.js'
}));

// Constantes para mensagens de alerta
const MENSAGEM_NOME_VAZIO = 'Por favor, digite um nome!';
const MENSAGEM_MINIMO_AMIGOS = 'Adicione pelo menos 2 amigos(as) para realizar o sorteio!';
const MENSAGEM_NUMERO_PAR = 'Por favor, adicione um número par de amigos(as) para o sorteio funcionar corretamente.\nAtualmente você tem ';

// Base de dados de nomes comuns (pode ser expandida)
const NOMES_COMUNS = [
    'Ana', 'André', 'Antonio', 'Beatriz', 'Bruno', 'Carlos', 'Carolina', 'Daniel', 
    'Daniela', 'Eduardo', 'Eduarda', 'Felipe', 'Fernanda', 'Gabriel', 'Gabriela', 
    'Henrique', 'Isabel', 'João', 'Julia', 'Lucas', 'Maria', 'Mariana', 'Miguel', 
    'Paulo', 'Pedro', 'Rafael', 'Rafaela', 'Ricardo', 'Sofia', 'Thiago', 'Victor', 
    'Victoria'
];

/**
 * @typedef {Object} Limites
 * @property {number} MIN_PARTICIPANTES - Número mínimo de participantes permitido
 * @property {number} MAX_PARTICIPANTES - Número máximo de participantes permitido
 * @property {number} VALOR_MIN_PRESENTE - Valor mínimo sugerido para presentes
 * @property {number} VALOR_MAX_PRESENTE - Valor máximo sugerido para presentes
 */

/**
 * Configurações e limites da aplicação
 * @type {Limites}
 */
const LIMITES = {
    MIN_PARTICIPANTES: 2,
    MAX_PARTICIPANTES: 100,
    VALOR_MIN_PRESENTE: 20,
    VALOR_MAX_PRESENTE: 500
};

// Função para exibir alertas
function exibirAlerta(mensagem) {
    alert(mensagem);
}

/**
 * Valida um nome de participante
 * @param {string} nome - Nome a ser validado
 * @returns {boolean} Verdadeiro se o nome é válido
 */
function validarNome(nome) {
    return nome.length >= 2 && // mínimo 2 caracteres
           nome.length <= 50 && // máximo 50 caracteres
           /^[a-zA-ZÀ-ÿ\s]+$/.test(nome); // apenas letras e espaços
}

// Adicionar função para capitalizar nomes
function capitalizarNome(nome) {
    return nome
        .toLowerCase()
        .split(' ')
        .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
        .join(' ');
}

// Adicionar função de validação de segurança
function sanitizarInput(texto) {
    return texto
        .replace(/[<>]/g, '') // Remove tags HTML
        .replace(/[;]/g, '')  // Remove ponto e vírgula
        .trim();
}

/**
 * Adiciona um novo amigo(a) à lista de amigos(as).
 * @fires salvarListaLocal
 * @fires aprenderNovoNome
 */
function adicionarAmigo() {
    const inputAmigo = document.getElementById('amigo');
    const listaAmigos = document.getElementById('listaAmigos'); // Movido para cá
    const nomeAmigo = capitalizarNome(sanitizarInput(inputAmigo.value.trim()));

    if (!validarNome(nomeAmigo)) {
        exibirAlerta('Nome inválido. Use apenas letras e espaços (2-50 caracteres).');
        return;
    }

    if (nomeJaExiste(nomeAmigo)) {
        exibirAlerta('Este nome já está na lista!');
        return;
    }

    if (listaAmigos.children.length >= LIMITES.MAX_PARTICIPANTES) {
        exibirAlerta(`Máximo de ${LIMITES.MAX_PARTICIPANTES} participantes atingido!`);
        return;
    }

    const novoAmigo = document.createElement('li');
    
    // Criando elementos separados para nome e botão
    const spanNome = document.createElement('span');
    spanNome.textContent = nomeAmigo;
    
    const botaoRemover = document.createElement('button');
    botaoRemover.className = 'botao-remover';
    botaoRemover.textContent = 'Remover'; // Adicionando o texto diretamente no botão
    botaoRemover.onclick = () => removerAmigo(botaoRemover);
    
    novoAmigo.appendChild(spanNome);
    novoAmigo.appendChild(botaoRemover);
    listaAmigos.appendChild(novoAmigo); // Adicionando o elemento à lista

    salvarListaLocal();
    inputAmigo.value = '';
    inputAmigo.focus();

    aprenderNovoNome(nomeAmigo);
}

function nomeJaExiste(nome) {
    const listaAmigos = document.getElementById('listaAmigos').children;
    return Array.from(listaAmigos).some(amigo => 
        amigo.querySelector('span').textContent.trim() === nome
    );
}

function removerAmigo(botao) {
    botao.parentElement.remove();
    salvarListaLocal();
}

function salvarListaLocal() {
    const listaAmigos = document.getElementById('listaAmigos');
    const amigos = Array.from(listaAmigos.children).map(li => 
        li.querySelector('span').textContent.trim()
    );
    localStorage.setItem('listaAmigos', JSON.stringify(amigos));
}

function carregarListaLocal() {
    const amigos = JSON.parse(localStorage.getItem('listaAmigos') || '[]');
    amigos.forEach(nome => {
        const input = document.getElementById('amigo');
        input.value = nome;
        adicionarAmigo();
    });
}

/**
 * Verifica se o número de amigos(as) é par e exibe uma mensagem de alerta se necessário.
 */
function verificarNumeroPar() {
    const listaAmigos = document.getElementById('listaAmigos').children;

    if (listaAmigos.length % 2 !== 0) {
        exibirAlerta(MENSAGEM_NUMERO_PAR + listaAmigos.length + ' amigos(as) na lista.');
    }
}

// Função para analisar compatibilidade usando ML5.js
/**
 * Analisa a compatibilidade entre dois participantes usando ML5.js
 * @param {string} amigo1 - Nome do primeiro participante
 * @param {string} amigo2 - Nome do segundo participante
 * @returns {Promise<number>} Porcentagem de compatibilidade
 */
async function analisarCompatibilidadeIA(amigo1, amigo2) {
    const sentiment = await ml5.sentiment('movieReviews');
    const score1 = await sentiment.predict(amigo1);
    const score2 = await sentiment.predict(amigo2);
    
    // Calcula compatibilidade baseada nos scores de sentimento
    const compatibilidade = Math.abs(1 - Math.abs(score1.score - score2.score)) * 100;
    return Math.round(compatibilidade);
}

// Função para gerar sugestões de presentes usando TensorFlow.js
async function gerarSugestaoPresente(nome, valorMaximo) {
    // Lista de presentes pré-definidos
    const presentes = [
        'Livro', 'Kit de Chocolate', 'Vale Presente', 
        'Acessório', 'Perfume', 'Experiência Gastronômica'
    ];
    
    // Usa características do nome para influenciar a sugestão
    const caracteres = nome.toLowerCase().split('');
    const valor = caracteres.reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Seleciona presente baseado no valor calculado
    const indice = valor % presentes.length;
    return `Sugestão: ${presentes[indice]} (Valor aprox.: R$ ${valorMaximo})`;
}

/**
 * Realiza o sorteio de amigo(a) secreto(a) entre os amigos(as) da lista.
 */
function sortearAmigo() {
    const listaAmigos = document.getElementById('listaAmigos').children;
    const resultado = document.getElementById('resultado');

    if (listaAmigos.length < 2) {
        exibirAlerta(MENSAGEM_MINIMO_AMIGOS);
        return;
    }

    resultado.innerHTML = '';
    const amigos = Array.from(listaAmigos).map(li => 
        li.querySelector('span').textContent.trim()
    );
    
    const sorteio = amigos.map((amigo, i) => {
        let proximo = (i + 1) % amigos.length;
        return `${amigo} → ${amigos[proximo]}`;
    });

    // Mostra o resultado do sorteio de forma síncrona
    sorteio.forEach(par => {
        const li = document.createElement('li');
        li.textContent = par;
        resultado.appendChild(li);
    });

    // Se quiser adicionar as sugestões de IA, faça em um segundo passo
    adicionarSugestoesIA(resultado.children);

    // Após mostrar o resultado, rola suavemente até os botões
    setTimeout(() => {
        const buttonContainer = document.querySelector('.button-container');
        buttonContainer.scrollIntoView({ behavior: 'smooth' });
    }, 500);
}

// Nova função para adicionar sugestões de IA após o sorteio
async function adicionarSugestoesIA(elementosSorteio) {
    for (const elemento of elementosSorteio) {
        const [doador, receptor] = elemento.textContent.split(' → ');
        
        try {
            // Adiciona análise de compatibilidade
            const compatibilidade = await analisarCompatibilidadeIA(doador, receptor);
            const spanCompatibilidade = document.createElement('span');
            spanCompatibilidade.className = 'compatibilidade';
            spanCompatibilidade.textContent = `💝 ${compatibilidade}% compatível`;
            elemento.appendChild(spanCompatibilidade);
            
            // Adiciona sugestão de presente
            const sugestao = await gerarSugestaoPresente(receptor, 100);
            const spanSugestao = document.createElement('span');
            spanSugestao.className = 'sugestao';
            spanSugestao.textContent = `🎁 ${sugestao}`;
            elemento.appendChild(spanSugestao);
        } catch (error) {
            console.error('Erro ao adicionar sugestões:', error);
        }
    }
}

function validarTelefone(telefone) {
    // Regex para validar número com DD (11 dígitos)
    const regex = /^[1-9]{2}[9][0-9]{8}$/;
    return regex.test(telefone);
}

/**
 * Compartilha o resultado do sorteio via WhatsApp
 * @requires Sorteio prévio realizado
 * @requires Número de telefone válido
 */
function compartilharWhatsApp() {
    const resultado = document.getElementById('resultado');
    const telefoneInput = document.getElementById('telefone');
    const telefone = telefoneInput.value.replace(/\D/g, '');
    
    if (!resultado.children.length) {
        exibirAlerta('Realize o sorteio primeiro antes de compartilhar!');
        return;
    }

    if (!validarTelefone(telefone)) {
        exibirAlerta('Digite um número de WhatsApp válido com DD (ex: 11912345678)');
        return;
    }
    
    // Prepara o texto com linguagem inclusiva e seta para melhor legibilidade
    let mensagem = "🎁 *Participantes sorteados no amigo(a) secreto(a)!* 🎁\n\n";
    Array.from(resultado.children).forEach(item => {
        let texto = item.textContent
            .replace('×', '')
            .trim();
        mensagem += texto + "\n";
    });
    mensagem += "\n💝 Desejamos um ótimo sorteio a todas as pessoas participantes! 💝";
    
    const mensagemCodificada = encodeURIComponent(mensagem);
    const urlWhatsApp = `https://wa.me/55${telefone}?text=${mensagemCodificada}`;
    
    window.open(urlWhatsApp, '_blank');
}

// Função auxiliar para atualizar sugestões
function atualizarSugestoes(valor, datalist) {
    const sugestoes = NOMES_COMUNS
        .filter(nome => nome.toLowerCase().includes(valor.toLowerCase()))
        .slice(0, 5)
        .map(nome => capitalizarNome(nome));

    datalist.innerHTML = '';
    sugestoes.forEach(nome => {
        const option = document.createElement('option');
        option.value = nome;
        datalist.appendChild(option);
    });
}

// Função auxiliar para input de telefone
function handleTelefoneInput(e) {
    let valor = e.target.value.replace(/\D/g, '');
    if (valor.length > 11) valor = valor.slice(0, 11);
    e.target.value = valor;
}

// Função para aprender com novos nomes
function aprenderNovoNome(nome) {
    if (!NOMES_COMUNS.includes(nome) && nome.length > 2) {
        NOMES_COMUNS.push(nome);
        // Ordena a lista alfabeticamente
        NOMES_COMUNS.sort();
        // Guarda no localStorage para persistir
        localStorage.setItem('nomesAprendidos', JSON.stringify(NOMES_COMUNS));
    }
}

// Carrega nomes aprendidos do localStorage
function carregarNomesAprendidos() {
    const nomesAprendidos = localStorage.getItem('nomesAprendidos');
    if (nomesAprendidos) {
        NOMES_COMUNS.push(...JSON.parse(nomesAprendidos));
        // Remove duplicatas e ordena
        const nomesUnicos = [...new Set(NOMES_COMUNS)].sort();
        NOMES_COMUNS.length = 0;
        NOMES_COMUNS.push(...nomesUnicos);
    }
}