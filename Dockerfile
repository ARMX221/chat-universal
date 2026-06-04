# Estágio 1: Build
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src src
RUN mvn clean package -DskipTests

# Estágio 2: Execução (imagem final mais leve)
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/chat-universal-1.0.0.jar app.jar

# Cria pastas para não dar erro se não tiver Cloudinary configurado
RUN mkdir data uploads

EXPOSE 8080
# Constrói a URL do JDBC em tempo de execução usando as variáveis do Render
ENTRYPOINT ["sh", "-c", "export SPRING_DATASOURCE_URL=jdbc:postgresql://$DB_HOST:$DB_PORT/$DB_NAME && java -jar app.jar"]
