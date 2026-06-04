FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
COPY src src

# Garante que o arquivo mvnw tem quebras de linha corretas e permissão de execução
RUN apk add --no-cache dos2unix && dos2unix mvnw && chmod +x mvnw

# Compila o projeto ignorando os testes para ser mais rápido
RUN ./mvnw clean package -DskipTests

# Estágio 2: Cria a imagem final apenas com o JRE (mais leve)
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copia o JAR compilado do estágio anterior
COPY --from=build /app/target/chat-universal-1.0.0.jar app.jar

# Cria as pastas necessárias
RUN mkdir data uploads

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
