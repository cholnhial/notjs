package dev.chol.notjs.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class Hello {

    @RequestMapping("/asd")
    public String home() {
        return "Hello Docker World";
    }

}
