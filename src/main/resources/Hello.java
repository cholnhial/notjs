import java.util.stream.IntStream;

void main() {
    String name = IO.readln ( "Enter your name: " );

    IntStream.range( 0, 100 ).forEach(i ->  IO.println("Hello, " + name));

}