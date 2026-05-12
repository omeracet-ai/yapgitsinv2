allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
// Inject a namespace for legacy plugins (e.g. file_picker 3.0.4) that lack one,
// which AGP 8+ requires. Workaround until those plugins are upgraded.
fun Project.applyMissingNamespace() {
    val androidExtension = extensions.findByName("android") ?: return
    val namespaceGetter = androidExtension.javaClass.methods.firstOrNull { it.name == "getNamespace" && it.parameterCount == 0 } ?: return
    val namespaceSetter = androidExtension.javaClass.methods.firstOrNull { it.name == "setNamespace" && it.parameterCount == 1 } ?: return
    if (namespaceGetter.invoke(androidExtension) == null) {
        namespaceSetter.invoke(androidExtension, project.group.toString())
    }
}
subprojects {
    if (state.executed) {
        applyMissingNamespace()
    } else {
        afterEvaluate { applyMissingNamespace() }
    }
}

subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
