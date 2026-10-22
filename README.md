# AVX — site

O site público da AVX (avxautomacao.com.br), publicado pelo GitHub Pages a partir da `main`.

## Páginas

| Arquivo | O que é |
|---|---|
| `index.html` | página inicial, com o formulário de contato |
| `catalogo.html` | simulador de projeto (catálogo de dispositivos) |
| `app.html` | demonstração do App AVX (casa simulada; não chama servidor nem guarda nada) |
| `privacidade.html` e `termos.html` | Política de Privacidade e Termos de Uso (com versão e data no topo) |
| `assets/` | estilo dos documentos legais (`documento.css`), favicon, imagens de compartilhamento, prévia do app e a fonte Inter (`assets/fontes/`, com a licença) |
| `scripts/` | `verificar_site.mjs` (roda em todo PR) e `app_telas.mjs` (fotos e conferência da demonstração, roda no computador) |

## No dia a dia

1. O Claude abre um **pull request** com as mudanças e a explicação.
2. O GitHub confere links, imagens e o padrão de marca (✓ verde no pull request).
3. Você revisa e clica em **Merge**.
4. Em 1 ou 2 minutos o site está atualizado.

Para desfazer: no pull request, botão **Revert**, e depois Merge do pull request de reversão.

## Segurança

Achou uma falha? Ver [SECURITY.md](SECURITY.md).
