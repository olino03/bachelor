FROM ollama/ollama:latest

ENV OLLAMA_HOST 0.0.0.0:8080
ENV OLLAMA_MODELS /models
ENV OLLAMA_DEBUG false
ENV OLLAMA_KEEP_ALIVE false

ENV MODEL gemma3:1b
RUN ollama serve & sleep 5 && ollama pull $MODEL

ENTRYPOINT ["ollama", "serve"]