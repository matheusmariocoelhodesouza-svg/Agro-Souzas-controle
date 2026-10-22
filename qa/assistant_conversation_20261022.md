# Comando IA — continuidade da conversa

Implementação de 22/10/2026. Mantém o modelo e a credencial de servidor existentes.

## Verificação automatizada

- 40 regressões existentes de backend aprovadas.
- 15 regressões adicionais aprovadas: continuidade, ordem das mensagens, resumo limitado, recuperação de propostas, isolamento por usuário/empresa, falhas de histórico, tipos de documento, limite combinado e status atual das ações.
- JavaScript do assistente, bootstrap e Service Worker verificado com `node --check`.
- A suíte de conversa foi incluída no Quality Gate.

## Verificação de interface

Prévia local com dados sintéticos e chamadas de servidor simuladas, usando a interface real de `c360-assistant360.js`:

- Mensagem inicial e continuação curta usam o mesmo ID de conversa.
- Nova conversa e seleção de uma conversa anterior recuperam as mensagens.
- Trocar empresa ou usuário limpa o histórico da tela anterior.
- Documento PDF é enviado em `documents`, enquanto imagens continuam em `images`.
- Duas fotos são enviadas juntas e abrem em visualização ampliada.
- Falha simulada preserva rascunho e anexo; nova tentativa reutiliza o original arquivado.
- Botão flutuante aparece fora da tela da IA e retorna à conversa atual.
- Tela de celular verificada em 375 px de área útil, sem rolagem lateral e com o campo de mensagem visível. Shift+Enter insere uma nova linha sem enviar.

As verificações não usam a chave real e não comprovam a qualidade de uma resposta do modelo em produção. A validação final de resposta e extração real requer a sessão autenticada do app. Não foram criados registros de apanha, combustível, manutenção ou folha para executar os testes.
