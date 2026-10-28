# Cortes Pó de Pólen: como publicar fora do Claude

Arquivos desta pasta:

- `cortes-pode-polen.html`: a página (um arquivo só).
- `worker.mjs`: o servidor que guarda a sua chave da Anthropic (opção com endereço próprio).

A página funciona de dois jeitos. Escolha um.

## Opção A: servidor próprio (recomendada para pessoas de fora)

Quem usa não precisa de conta nem de chave. O uso é cobrado na conta da Anthropic da Néktar.

1. Crie uma chave de API no console da Anthropic (console.anthropic.com) e, lá mesmo, defina um limite mensal de gasto.
2. Crie uma conta gratuita na Cloudflare e, em Workers, crie um Worker novo.
3. Cole o conteúdo de `worker.mjs` no editor do Worker e publique.
4. Na área de variáveis e segredos do Worker, crie:
   - `ANTHROPIC_API_KEY` (segredo): a chave do passo 1.
   - `ACCESS_CODE` (segredo): um código que você inventa e passa para quem for usar.
   - `ALLOWED_ORIGIN` (opcional): o endereço onde a página ficará, por exemplo `https://cortes.nektardesign.com.br`.
5. Copie a URL do Worker (algo como `https://nome.conta.workers.dev`).
6. Abra `cortes-pode-polen.html` num editor de texto, procure `endpoint: ""` e coloque a URL entre as aspas. Salve.
7. Publique o HTML em qualquer hospedagem (Cloudflare Pages, Netlify, ou o próprio site da Néktar). Mande o link e o código de acesso para as pessoas.

Se o código vazar, troque `ACCESS_CODE` no Worker. Como não há limite por pessoa, o limite de gasto do passo 1 é a sua proteção.

## Opção B: cada pessoa usa a própria chave

Deixe `endpoint: ""` como está e publique só o HTML. Cada pessoa cola a própria chave de API da Anthropic no campo da página. A chave fica só naquela aba do navegador. É a opção mais simples de publicar, mas só serve para quem já tem conta de desenvolvedor na Anthropic.

## Observações

- O nome do modelo (`claude-sonnet-5-5`) aparece em `CONFIG.model` no HTML e em `DEFAULT_MODEL` no Worker. Confira na documentação da Anthropic se o nome ainda é válido e troque se precisar.
- A página lê o Word (.docx) no próprio navegador. Nada do arquivo é enviado antes de você clicar em Analisar.
- A análise envia a transcrição e as anotações para a Anthropic. Avise convidados e parceiros se o conteúdo for confidencial.
