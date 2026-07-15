package com.orbital.nusmaps.repository;

import com.orbital.nusmaps.model.Faculty;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FacultyRepository extends JpaRepository<Faculty, Long> {
    @Query("""
        select distinct f
        from Faculty f
        left join fetch f.aliases fa
        order by f.facultyName asc
        """)
    List<Faculty> findAllSearchFaculties();
}
